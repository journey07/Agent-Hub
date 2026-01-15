import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-xs)',
                    marginBottom: '4px'
                }}>{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{
                        color: entry.color,
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 600
                    }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function ApiUsageChart({ data, type = 'area' }) {
    const ChartComponent = type === 'bar' ? BarChart : AreaChart;
    const DataComponent = type === 'bar' ? Bar : Area;

    return (
        <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey={data[0]?.date ? 'date' : 'hour'}
                        stroke="var(--color-text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="var(--color-text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${value / 1000}K` : value}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {type === 'area' ? (
                        <>
                            <Area
                                type="monotone"
                                dataKey="calls"
                                name="API 호출"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCalls)"
                            />
                            {data[0]?.tasks !== undefined && (
                                <Area
                                    type="monotone"
                                    dataKey="tasks"
                                    name="작업"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTasks)"
                                />
                            )}
                        </>
                    ) : (
                        <Bar
                            dataKey="calls"
                            name="API 호출"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                        />
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
}

export default ApiUsageChart;
