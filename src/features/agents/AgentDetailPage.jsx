import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Activity, AlertCircle, Database, Shield, Key, Cpu, Zap, BarChart3, TrendingUp, History, ExternalLink, Edit3, Check, X } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { formatNumber, formatRelativeTime, formatLogTimestamp, getTodayInKoreaString, getTodayInKorea } from '../../utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import { AnimatedNumber } from '../../components/common';
import { updateAgentInfo, getAgentActivityLogs } from '../../services/agentService';
import './AgentDetailPage.css';

// Task Performance Item 컴포넌트 (애니메이션을 위해 분리)
function TaskPerformanceItem({ task }) {
    // name이 문자열이고 '(API Call)'이 포함된 경우 해당 부분만 빨간색으로 렌더링
    const renderName = () => {
        if (typeof task.name === 'string' && task.name.includes('(API Call)')) {
            const parts = task.name.split('(API Call)');
            return (
                <>
                    {parts[0]}
                    <span style={{ color: '#ef4444' }}>(API Call)</span>
                    {parts[1]}
                </>
            );
        }
        return task.name;
    };

    return (
        <div className="task-item-premium">
            <div className="task-info-top">
                <div className="task-name-group">
                    <div className="task-icon-box">{task.icon}</div>
                    <span className="task-name-text">{renderName()}</span>
                </div>
                <div className="task-count-group">
                    <span className="task-today-val">
                        <AnimatedNumber value={task.period || 0} />
                    </span>
                    <span className="task-total-val">{task.total} total</span>
                </div>
            </div>
            <div className="task-progress-bg">
                <div
                    className="task-progress-bar"
                    style={{
                        width: `${Math.min(100, (task.period / (task.total || 1)) * 100)}%`,
                        backgroundColor: task.color
                    }}
                />
            </div>
        </div>
    );
}

export function AgentDetailPage() {
    const { id } = useParams();
    const { agents, activityLogs } = useAgents();
    // Live find agent from context to ensure updates
    const agent = useMemo(() => agents.find(a => a.id === id), [agents, id]);

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'logs'
    const [chartTimeRange, setChartTimeRange] = useState('today'); // 'today' (others disabled for now)

    // System Info 수정 관련 상태
    const [isEditingSystemInfo, setIsEditingSystemInfo] = useState(false);
    const [editModel, setEditModel] = useState('');
    const [editAccount, setEditAccount] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Live Log Stream 추가 로드 관련 상태
    const [extraLogs, setExtraLogs] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreLogs, setHasMoreLogs] = useState(true);
    const LOGS_PER_PAGE = 50;

    // Initialize isMobile immediately to prevent initial render issues
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth <= 768;
        }
        return false;
    });
    // Auto-scroll logic removed as logs are ordered newest-first (top)

    // Detect mobile screen size changes
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Scroll to top on mount or id change
    useEffect(() => {
        // Try to find the scrollable container first
        const scrollContainer = document.querySelector('.app-layout__content');
        if (scrollContainer) {
            scrollContainer.scrollTo(0, 0);
        } else {
            // Fallback to window scroll
            window.scrollTo(0, 0);
        }
    }, [id]);

    // System Info 수정 모드 시작
    const handleEditStart = () => {
        setEditModel(agent?.model || '');
        setEditAccount(agent?.account || '');
        setIsEditingSystemInfo(true);
    };

    // System Info 수정 취소
    const handleEditCancel = () => {
        setIsEditingSystemInfo(false);
        setEditModel('');
        setEditAccount('');
    };

    // System Info 저장
    const handleEditSave = async () => {
        if (!agent) return;
        setIsSaving(true);
        try {
            const { error } = await updateAgentInfo(agent.id, {
                model: editModel,
                account: editAccount
            });
            if (error) {
                console.error('Failed to save:', error);
                alert('저장 실패: ' + error.message);
            } else {
                setIsEditingSystemInfo(false);
            }
        } catch (err) {
            console.error('Save error:', err);
            alert('저장 중 오류 발생');
        } finally {
            setIsSaving(false);
        }
    };

    // 에이전트가 바뀌면 추가 로그 초기화
    useEffect(() => {
        setExtraLogs([]);
        setHasMoreLogs(true);
    }, [id]);

    // 모든 훅을 조건부 return 전에 호출 (React Hooks 규칙 준수)
    // Filter logs for this agent (agent가 없어도 안전하게 처리)
    const baseAgentLogs = useMemo(() => {
        if (!agent) return [];
        return activityLogs.filter(log => log.agent === agent.name || log.agentId === agent.id);
    }, [activityLogs, agent]);

    // 기본 로그 + 추가 로드된 로그 합치기 (중복 제거)
    const agentLogs = useMemo(() => {
        if (extraLogs.length === 0) return baseAgentLogs;
        const baseIds = new Set(baseAgentLogs.map(log => log.id));
        const uniqueExtraLogs = extraLogs.filter(log => !baseIds.has(log.id));
        return [...baseAgentLogs, ...uniqueExtraLogs];
    }, [baseAgentLogs, extraLogs]);

    // 추가 로그 불러오기
    const handleLoadMore = async () => {
        if (!agent || isLoadingMore || !hasMoreLogs) return;
        setIsLoadingMore(true);
        try {
            const offset = agentLogs.length;
            const { data, error } = await getAgentActivityLogs(agent.id, {
                limit: LOGS_PER_PAGE,
                offset
            });
            if (error) {
                console.error('Failed to load more logs:', error);
            } else if (data) {
                if (data.length < LOGS_PER_PAGE) {
                    setHasMoreLogs(false);
                }
                if (data.length > 0) {
                    setExtraLogs(prev => [...prev, ...data]);
                }
            }
        } catch (err) {
            console.error('Load more error:', err);
        } finally {
            setIsLoadingMore(false);
        }
    };


    const chartData = useMemo(() => {
        if (!agent) return [];

        if (chartTimeRange === 'today') {
            // Hourly - Today (오늘 날짜만 - 한국 시간대 기준, 24시 리셋)
            const todayKorea = getTodayInKoreaString();

            // hourlyStats를 맵으로 변환하여 빠른 조회 (오늘 날짜만)
            const statsMap = new Map();
            if (agent.hourlyStats && Array.isArray(agent.hourlyStats)) {
                agent.hourlyStats.forEach(stat => {
                    // 오늘 날짜가 아닌 데이터는 제외 (24시 리셋)
                    if (stat.updated_at && stat.updated_at !== todayKorea) {
                        return;
                    }

                    const hour = stat.hour || stat.hour_key || stat.h;
                    if (hour !== undefined && hour !== null) {
                        const hourStr = String(hour).padStart(2, '0');
                        statsMap.set(hourStr, {
                            tasks: stat.tasks || 0,
                            apiCalls: stat.apiCalls || stat.calls || 0
                        });
                    }
                });
            }

            // 항상 0시부터 23시까지 모든 시간 포함
            const fullDayData = Array.from({ length: 24 }, (_, i) => {
                const hourStr = i.toString().padStart(2, '0');
                const stat = statsMap.get(hourStr) || { tasks: 0, apiCalls: 0 };
                return {
                    name: isMobile ? i.toString() : `${hourStr}:00`,
                    Tasks: Number(stat.tasks || 0),
                    'API Calls': Number(stat.apiCalls || 0)
                };
            });

            return fullDayData;
        } else {
            // Daily - Week/Month (Show Daily History + Today)
            if (!agent) return [];
            const history = agent.dailyHistory || [];

            // Use Korean timezone (24시 기준 = 자정 00:00)
            const todayStr = getTodayInKoreaString();
            const today = getTodayInKorea();

            // 날짜 범위 계산: week는 최근 7일, month는 최근 30일
            const days = chartTimeRange === 'week' ? 7 : 30;

            // dailyHistory를 날짜 맵으로 변환하여 빠른 조회
            const historyMap = new Map();
            history.forEach(d => {
                if (d.date) {
                    historyMap.set(d.date, {
                        tasks: d.tasks || 0,
                        calls: d.calls || 0
                    });
                }
            });

            // 모든 날짜 생성 (과거 days-1일 + 오늘)
            const fullRangeData = Array.from({ length: days }, (_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - (days - 1 - i));
                // 로컬 시간대 기준으로 YYYY-MM-DD 생성 (UTC 변환 방지)
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const isToday = dateStr === todayStr;
                const stat = isToday
                    ? { tasks: agent.todayTasks || 0, calls: agent.todayApiCalls || 0 }
                    : historyMap.get(dateStr) || { tasks: 0, calls: 0 };

                return {
                    name: isToday ? 'Today' : dateStr.replace(/^\d{4}-/, ''), // MM-DD
                    Tasks: Number(stat.tasks || 0),
                    'API Calls': Number(stat.calls || 0)
                };
            });

            return fullRangeData;
        }
    }, [agent, chartTimeRange]);

    // 시간축 표시를 위한 ticks 계산 - 모바일에서는 간격 조정
    const xAxisTicks = useMemo(() => {
        if (chartTimeRange === 'today') {
            if (isMobile) {
                // 모바일: 3시간 간격으로 표시 (0, 3, 6, 9, 12, 15, 18, 21) - "17" 형식
                return Array.from({ length: 8 }, (_, i) => {
                    const hour = i * 3;
                    return hour.toString();
                });
            } else {
                // 데스크탑: 0시부터 23시까지 모든 시간을 명시적으로 지정
                return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
            }
        } else if (chartTimeRange === 'week') {
            if (isMobile) {
                // 모바일: Week은 7개 모두 표시
                return null;
            }
        } else if (chartTimeRange === 'month') {
            if (isMobile) {
                // 모바일: Month는 15개만 표시 (2개 간격)
                return chartData
                    .filter((_, index) => index % 2 === 0)
                    .map(item => item.name);
            }
        }
        return null; // 기본 동작 사용
    }, [chartTimeRange, isMobile, chartData]);

    const apiLabels = {
        'preview-image': '2D Layout',
        'generate-3d-installation': '3D Installation',
        'calculate': 'Quote Calc',
        'pdf': 'PDF Gen',
        'parse-consultation': 'Memo Parse'
    };

    const apiData = useMemo(() => {
        if (!agent || !agent.apiBreakdown) return [];
        return Object.entries(agent.apiBreakdown).map(([key, value]) => ({
            name: apiLabels[key] || key,
            calls: value.total,
            today: value.today
        })).sort((a, b) => b.calls - a.calls);
    }, [agent]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    // Premium Icon Components
    const PremiumIcon = ({ type, color = 'currentColor', size = 24 }) => {
        const gradients = {
            blue: ['#3b82f6', '#2563eb'],
            emerald: ['#10b981', '#059669'],
            purple: ['#8b5cf6', '#7c3aed'],
            amber: ['#f59e0b', '#d97706'],
            rose: ['#f43f5e', '#e11d48'],
            sky: ['#0ea5e9', '#0284c7']
        };
        const grad = gradients[color] || (color.startsWith('#') ? [color, color] : gradients.blue);
        const gradId = `grad-${type}-${color}`;

        const icons = {
            tasks: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 14L11 16L15 12" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            api: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            success: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 12L11 14L15 10" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            latency: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                    <path d="M12 8V12L14.5 14.5" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            pdf: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2V8H20" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 13H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 9H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            cube: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M21 16V8C20.9996 7.64927 20.9044 7.30481 20.725 7.00385C20.5455 6.70289 20.2887 6.45684 19.982 6.292L13.982 2.792C13.6796 2.61559 13.3392 2.52344 12.99 2.52344C12.6408 2.52344 12.3004 2.61559 11.998 2.792L6.018 6.292C5.71131 6.45684 5.45451 6.70289 5.27503 7.00385C5.09554 7.30481 5.00037 7.64927 5 8V16C5.00037 16.3507 5.09554 16.6952 5.27503 16.9961C5.45451 17.2971 5.71131 17.5432 6.018 17.708L12.018 21.208C12.3204 21.3844 12.6608 21.4766 13.01 21.4766C13.3592 21.4766 13.6996 21.3844 14.002 21.208L20.002 17.708C20.3087 17.5432 20.5655 17.2971 20.745 16.9961C20.9244 16.6952 21.0196 16.3507 21 16Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 22V12" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 12L20 8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 12L4 8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            bell: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6981 21.5547 10.4458 21.3031 10.27 21" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        };
        return icons[type] || icons.tasks;
    };

    const taskPerformanceData = useMemo(() => {
        if (!agent || !agent.apiBreakdown) {
            return [];
        }

        let currentPeriodData = [];
        // 한국 시간대 기준 오늘 날짜
        const todayStr = getTodayInKoreaString();

        if (chartTimeRange === 'today') {
            // 모든 에이전트: daily_stats.breakdown 사용
            const todayDailyStats = (agent.dailyHistory || []).find(d => d.date === todayStr);
            let todayBreakdown = {};
            if (todayDailyStats && todayDailyStats.breakdown) {
                let breakdown = todayDailyStats.breakdown;
                if (typeof breakdown === 'string') {
                    try {
                        breakdown = JSON.parse(breakdown);
                    } catch (e) {
                        breakdown = {};
                    }
                }
                if (breakdown && typeof breakdown === 'object') {
                    todayBreakdown = breakdown;
                }
            }
            currentPeriodData = [todayBreakdown];
        } else {
            const days = chartTimeRange === 'week' ? 7 : 30;
            // Use Korean timezone (24시 기준 = 자정 00:00)
            const today = getTodayInKorea();

            // 날짜 범위 계산: 오늘 포함하여 최근 days일
            // 예: week (7일) = 오늘 + 과거 6일 = 총 7일
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);

            // dailyHistory에서 날짜 범위 내의 데이터만 필터링 (오늘 제외)
            const filteredByDate = (agent.dailyHistory || [])
                .filter(d => {
                    if (!d.date) return false;
                    // 날짜 문자열을 Date 객체로 변환 (YYYY-MM-DD 형식)
                    const date = new Date(d.date + 'T00:00:00');
                    date.setHours(0, 0, 0, 0);
                    // 날짜 범위 내이고 오늘 날짜가 아닌 것만 포함
                    return date >= startDate && d.date !== todayStr;
                });

            // breakdown 데이터를 정규화하여 일관된 구조로 변환
            const historyWithoutToday = filteredByDate
                .map(d => {
                    let breakdown = d.breakdown;

                    // breakdown이 문자열인 경우 (JSONB가 문자열로 파싱된 경우)
                    if (typeof breakdown === 'string') {
                        try {
                            breakdown = JSON.parse(breakdown);
                        } catch (e) {
                            breakdown = {};
                        }
                    }

                    // breakdown이 null이거나 undefined인 경우 빈 객체로 처리
                    if (!breakdown || typeof breakdown !== 'object') {
                        breakdown = {};
                    }

                    return breakdown;
                })
            // 빈 breakdown도 포함 (0 값으로 처리하기 위해)
            // 이렇게 하면 날짜 범위 내의 모든 날짜가 포함됨

            // 오늘 데이터: 모든 에이전트 daily_stats.breakdown 사용
            let todayBreakdown = {};
            const todayDailyStats = (agent.dailyHistory || []).find(d => d.date === todayStr);
            if (todayDailyStats && todayDailyStats.breakdown) {
                let breakdown = todayDailyStats.breakdown;
                if (typeof breakdown === 'string') {
                    try {
                        breakdown = JSON.parse(breakdown);
                    } catch (e) {
                        breakdown = {};
                    }
                }
                if (breakdown && typeof breakdown === 'object') {
                    todayBreakdown = breakdown;
                }
            }

            currentPeriodData = [todayBreakdown, ...historyWithoutToday];
        }

        const sum = (types) => {
            if (!currentPeriodData || currentPeriodData.length === 0) {
                return 0;
            }
            return currentPeriodData.reduce((acc, day) => {
                if (!day || typeof day !== 'object') {
                    return acc;
                }
                const daySum = types.reduce((dacc, t) => {
                    const val = day[t];
                    if (val === null || val === undefined) {
                        return dacc;
                    }
                    // Handle both structures: {today, total} for Today tab or Number for History
                    if (val && typeof val === 'object' && 'today' in val) {
                        return dacc + (Number(val.today) || 0);
                    }
                    return dacc + (Number(val) || 0);
                }, 0);
                return acc + daySum;
            }, 0);
        };

        // Agent-specific task definitions
        if (agent.id === 'agent-mansumetal-001') {
            const openCount = sum(['open-consulting']);
            // Total은 모든 dailyHistory의 breakdown에서 합산
            const openTotal = (agent.dailyHistory || []).reduce((acc, d) => {
                if (!d.breakdown) return acc;
                let breakdown = d.breakdown;
                if (typeof breakdown === 'string') {
                    try { breakdown = JSON.parse(breakdown); } catch (e) { return acc; }
                }
                return acc + (Number(breakdown['open-consulting']) || 0);
            }, 0);

            const aiCount = sum(['ai-consulting']);
            const aiTotal = (agent.dailyHistory || []).reduce((acc, d) => {
                if (!d.breakdown) return acc;
                let breakdown = d.breakdown;
                if (typeof breakdown === 'string') {
                    try { breakdown = JSON.parse(breakdown); } catch (e) { return acc; }
                }
                return acc + (Number(breakdown['ai-consulting']) || 0);
            }, 0);

            return [
                {
                    id: 'open',
                    name: '옵션 선택 도우미 호출',
                    period: openCount,
                    total: openTotal,
                    icon: <PremiumIcon type="bell" color="blue" size={20} />,
                    color: '#3b82f6'
                },
                {
                    id: 'ai',
                    name: 'AI 도우미 답변 완료 (API Call)',
                    period: aiCount,
                    total: aiTotal,
                    icon: <PremiumIcon type="zap" color="amber" size={20} />,
                    color: '#f59e0b'
                }
            ];
        }

        // Default: Quotation Agent tasks (agent-worldlocker-001)
        // Total은 모든 dailyHistory의 breakdown에서 합산 (옵션분석 에이전트와 동일)
        const sumTotal = (types) => (agent.dailyHistory || []).reduce((acc, d) => {
            if (!d.breakdown) return acc;
            let breakdown = d.breakdown;
            if (typeof breakdown === 'string') {
                try { breakdown = JSON.parse(breakdown); } catch (e) { return acc; }
            }
            return acc + types.reduce((sum, t) => sum + (Number(breakdown[t]) || 0), 0);
        }, 0);

        const quoteCount = sum(['calculate']);
        const quoteTotal = sumTotal(['calculate']);

        const threeDCount = sum(['generate-3d-installation']);
        const threeDTotal = sumTotal(['generate-3d-installation']);

        const excelCount = sum(['excel', 'pdf']);
        const excelTotal = sumTotal(['excel', 'pdf']);

        const parseCount = sum(['parse-consultation']);
        const parseTotal = sumTotal(['parse-consultation']);

        return [
            {
                id: 'quote',
                name: '2D 레이아웃 이미지 생성 및 견적 산출',
                period: quoteCount,
                total: quoteTotal,
                icon: <PremiumIcon type="tasks" color="#f6a53bff" size={20} />,
                color: '#f6a53bff'
            },
            {
                id: '3d',
                name: '3D 설치 이미지 생성 (API Call)',
                period: threeDCount,
                total: threeDTotal,
                icon: <PremiumIcon type="cube" color="#293ec5ff" size={20} />,
                color: '#293ec5ff'
            },
            {
                id: 'excel',
                name: '견적서 생성(Excel/PDF 파일)',
                period: excelCount,
                total: excelTotal,
                icon: <PremiumIcon type="pdf" color="#1d853eff" size={20} />,
                color: '#1d853eff'
            },
            {
                id: 'parse',
                name: '상담 메모 분석 (API Call)',
                period: parseCount,
                total: parseTotal,
                icon: <PremiumIcon type="zap" color="#8b5cf6" size={20} />,
                color: '#8b5cf6'
            }
        ];
    }, [agent, chartTimeRange]);

    // 조건부 return은 모든 훅 호출 후에만 실행
    if (agents.length === 0) {
        // 아직 데이터가 로드되지 않음 (로딩 중)
        return (
            <div className="agent-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Loading...</h2>
                    <p style={{ marginBottom: '24px' }}>Loading agent data...</p>
                </div>
            </div>
        );
    }

    if (!agent) {
        // 데이터는 로드되었지만 해당 agent를 찾을 수 없음
        return (
            <div className="agent-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Agent Not Found</h2>
                    <p style={{ marginBottom: '24px' }}>The agent you are looking for does not exist.</p>
                    <Link to="/agents" className="btn btn--primary">
                        Return to Agents
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="agent-detail-page">
            {/* Header */}
            <div className="detail-header">
                <div className="header-left">
                    <Link to="/agents" className="back-btn">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="agent-title-group">
                        <div className="agent-title-row">
                            <h1 className="agent-name">{agent.name}</h1>
                        </div>
                        <div className="agent-meta">
                            <span>{agent.client}</span>
                        </div>
                    </div>
                </div>
                <div className="detail-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        Activity Feed
                    </button>
                </div>
            </div>

            {/* KPI Cards - Hide on mobile when Activity Feed is active */}
            {!(isMobile && activeTab === 'logs') && (
                <div className="kpi-grid">
                    <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                            <PremiumIcon type="tasks" color="blue" size={36} />
                        </div>
                        <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                            <div className="kpi-label">Today Tasks</div>
                            <div className="kpi-value">
                                <AnimatedNumber value={agent.todayTasks || 0} formatter={formatNumber} />
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                                Total: {formatNumber(agent.totalTasks || Object.values(agent.apiBreakdown || {}).reduce((acc, v) => acc + (v.total || 0), 0))}
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                            <PremiumIcon type="api" color="rose" size={36} />
                        </div>
                        <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                            <div className="kpi-label">Today API Calls</div>
                            <div className="kpi-value">
                                <AnimatedNumber value={agent.todayApiCalls || 0} formatter={formatNumber} />
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                                Total: {formatNumber(agent.totalApiCalls)}
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                            <PremiumIcon type="latency" color="amber" size={36} />
                        </div>
                        <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                            <div className="kpi-label">Avg Latency</div>
                            <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
                                <AnimatedNumber value={agent.avgResponseTime || 0} />
                                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.25rem' }}>ms</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                                Real-time stats
                            </div>
                        </div>
                    </div>

                    <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                            <PremiumIcon type="success" color="emerald" size={36} />
                        </div>
                        <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                            <div className="kpi-label">Success Rate</div>
                            <div className={`kpi-value ${agent.apiStatus === 'error' ? 'text-slate-400' : ''}`}>
                                {agent.apiStatus === 'error' ? (
                                    '0.0%'
                                ) : (
                                    <AnimatedNumber
                                        value={((1 - (agent.errorRate || 0)) * 100)}
                                        formatter={(val) => `${val.toFixed(1)}%`}
                                    />
                                )}
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                                {agent.apiStatus === 'error' ? 'Connection Failed' : 'System Healthy'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'overview' ? (
                <div className="detail-content-grid">
                    {/* Row 1, Col 1: Chart */}
                    <div className="section-card chart-section grid-item-chart">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                <Activity size={20} className="text-blue-500" />
                                {chartTimeRange === 'today' ? 'Hourly Activity' : 'Daily Activity'}
                            </h3>
                            <div className="detail-tabs" style={{ padding: '2px', borderRadius: '8px' }}>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'today' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('today')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Today
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'week' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('week')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Week
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'month' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('month')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Month
                                </button>
                            </div>
                        </div>

                        <div className="chart-wrapper" style={{ flex: 1, minHeight: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    key={chartTimeRange + (agent.hourlyStats?.length || 0)}
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                                >
                                    <defs>
                                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        fontSize={isMobile ? 11 : 10}
                                        tickLine={false}
                                        axisLine={false}
                                        ticks={xAxisTicks}
                                        angle={isMobile && chartTimeRange !== 'today' ? -45 : (isMobile ? 0 : (chartTimeRange === 'today' ? -45 : 0))}
                                        textAnchor={isMobile && chartTimeRange !== 'today' ? "end" : (isMobile ? "middle" : (chartTimeRange === 'today' ? "end" : "middle"))}
                                        height={isMobile && chartTimeRange !== 'today' ? 60 : (isMobile ? 40 : 50)}
                                        minTickGap={isMobile ? 0 : -10}
                                        allowDuplicatedCategory={true}
                                        interval={isMobile ? 0 : "preserveStartEnd"}
                                        padding={chartTimeRange === 'today' ? { left: 0, right: 0 } : { left: 20, right: 20 }}
                                        dy={8}
                                    />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        padding: '12px 16px'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            marginBottom: '8px',
                                                            borderBottom: '1px solid #e2e8f0',
                                                            paddingBottom: '6px'
                                                        }}>
                                                            {label}
                                                        </div>
                                                        {payload.map((entry, index) => (
                                                            <div key={index} style={{
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                color: entry.color,
                                                                marginTop: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: entry.color
                                                                }}></span>
                                                                <span>{entry.name}:</span>
                                                                <span style={{ fontWeight: '700' }}>{entry.value.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area isAnimationActive={false} type="monotone" dataKey="Tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                                    <Area isAnimationActive={false} type="monotone" dataKey="API Calls" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorApi)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Row 1, Col 2: Task Performance */}
                    <div className="section-card grid-item-task-perf">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                <Database size={20} className="text-slate-500" />
                                {isMobile ? 'Task' : 'Task Performance'}
                            </h3>
                            <div className="detail-tabs" style={{ padding: '2px', borderRadius: '8px' }}>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'today' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('today')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Today
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'week' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('week')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Week
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'month' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('month')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Month
                                </button>
                            </div>
                        </div>
                        <div className="task-performance-list" style={{ flex: 1 }}>
                            {taskPerformanceData.map(task => (
                                <TaskPerformanceItem key={task.id} task={task} />
                            ))}
                        </div>
                    </div>

                    {/* Row 2, Col 1: Recent Logs */}
                    <div className="section-card grid-item-logs">
                        <h3 className="section-title">
                            <History size={20} className="text-slate-500" />
                            Recent Logs
                        </h3>
                        <div className="recent-logs-list">
                            {agentLogs.length > 0 ? (
                                agentLogs.slice(0, 5).map((log, idx) => {
                                    // 모바일에서 시간 형식: "11:40"만 표시
                                    const formatTimeForMobile = (dateString) => {
                                        if (!dateString) return '-';
                                        const date = new Date(dateString);
                                        if (isNaN(date.getTime())) return '-';
                                        const hours = String(date.getHours()).padStart(2, '0');
                                        const minutes = String(date.getMinutes()).padStart(2, '0');
                                        return `${hours}:${minutes}`;
                                    };

                                    return (
                                        <div key={log.id || idx} className="recent-log-item">
                                            <span className="log-ts">
                                                [{isMobile ? formatTimeForMobile(log.timestamp) : formatLogTimestamp(log.timestamp)}]
                                            </span>
                                            {!isMobile && (
                                                <span className={`log-type ${log.type === 'error' ? 'error' : 'success'}`}>
                                                    {log.type ? log.type.toUpperCase() : 'INFO'}
                                                </span>
                                            )}
                                            <span className="log-msg">
                                                {log.action}
                                                {log.userName && (
                                                    <span style={{ color: '#64748b', fontSize: '0.9em', marginLeft: '8px' }}>
                                                        - {log.userName}
                                                    </span>
                                                )}
                                            </span>
                                            {!isMobile && log.type === 'success' && log.responseTime && log.responseTime > 0 && (
                                                <span className="log-latency">
                                                    {log.responseTime}ms
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="empty-logs-mini">
                                    <Activity size={20} style={{ opacity: 0.5 }} />
                                    <span>No recent logs</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2, Col 2: System Info */}
                    <div className="section-card grid-item-system">
                        <h3 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={20} style={{ color: '#0b0419ff' }} />
                                System Info
                            </div>
                            {!isEditingSystemInfo ? (
                                <button
                                    onClick={handleEditStart}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: '#64748b'
                                    }}
                                    title="Edit"
                                >
                                    <Edit3 size={16} />
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={handleEditSave}
                                        disabled={isSaving}
                                        style={{
                                            background: '#10b981',
                                            border: 'none',
                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'white',
                                            opacity: isSaving ? 0.6 : 1
                                        }}
                                        title="Save"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        onClick={handleEditCancel}
                                        disabled={isSaving}
                                        style={{
                                            background: '#ef4444',
                                            border: 'none',
                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            color: 'white'
                                        }}
                                        title="Cancel"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </h3>
                        <div className="info-list">
                            <div className="info-item">
                                <span className="info-label">Model Engine</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Cpu size={18} style={{ color: '#0ea5e9' }} />
                                    {isEditingSystemInfo ? (
                                        <input
                                            type="text"
                                            value={editModel}
                                            onChange={(e) => setEditModel(e.target.value)}
                                            placeholder="e.g. gpt-4, gemini-pro"
                                            style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    ) : (
                                        <span className="info-value">{agent.model || 'Unknown Model'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="info-divider" />
                            <div className="info-item">
                                <span className="info-label">Account Info</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                    <Key size={18} style={{ color: '#0ea5e9' }} />
                                    {isEditingSystemInfo ? (
                                        <input
                                            type="text"
                                            value={editAccount}
                                            onChange={(e) => setEditAccount(e.target.value)}
                                            placeholder="e.g. OpenAI - username"
                                            style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                    ) : (
                                        <span className="info-value">{agent.account || 'Not configured'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="log-viewer-container">
                    <div className="log-viewer-card">
                        <div className="terminal-header">
                            <div className="terminal-title">
                                <div className="pulse-dot" />
                                Live Log Stream
                            </div>
                            <div className="terminal-subtitle">
                                Connected via WebSocket
                            </div>
                        </div>
                        <div className="terminal-body custom-scrollbar">
                            {agentLogs.length > 0 ? (
                                <>
                                    {agentLogs.map((log, idx) => (
                                        <div key={log.id || idx} className="log-entry">
                                            <div className="log-entry-header">
                                                <span className="log-ts">
                                                    [{formatLogTimestamp(log.timestamp)}]
                                                </span>
                                                <span className={`log-type ${log.type === 'error' ? 'error' : 'success'}`}>
                                                    {log.type ? log.type.toUpperCase() : 'INFO'}
                                                </span>
                                            </div>
                                            <span className="log-msg">
                                                {log.action}
                                                {log.userName && (
                                                    <span style={{ color: '#64748b', fontSize: '0.9em', marginLeft: '8px' }}>
                                                        - {log.userName}
                                                    </span>
                                                )}
                                            </span>
                                            {!isMobile && log.type === 'success' && log.responseTime && log.responseTime > 0 && (
                                                <span className="log-latency">
                                                    {log.responseTime}ms
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    {/* 더 불러오기 버튼 */}
                                    {hasMoreLogs && (
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            padding: '16px',
                                            borderTop: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                style={{
                                                    background: 'rgba(59, 130, 246, 0.2)',
                                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                                    color: '#60a5fa',
                                                    padding: '8px 24px',
                                                    borderRadius: '6px',
                                                    cursor: isLoadingMore ? 'not-allowed' : 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    opacity: isLoadingMore ? 0.6 : 1,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {isLoadingMore ? 'Loading...' : 'Load 50 logs more'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="empty-logs">
                                    <Activity size={32} style={{ opacity: 0.5 }} />
                                    <p>No logs recorded yet...</p>
                                    <p style={{ fontSize: '0.8rem' }}>Waiting for incoming activities</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
