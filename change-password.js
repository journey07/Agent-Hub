import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
}

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    console.error('   Supabase 대시보드 → Settings → API → service_role key를 복사해서 .env.local에 추가하세요.');
    process.exit(1);
}

// Service Role Key로 Supabase 클라이언트 생성 (Admin 권한)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Readline 인터페이스 생성
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function changePassword() {
    try {
        console.log('\n🔐 Supabase 비밀번호 변경 도구\n');
        
        // 환경 변수에서 비밀번호 가져오기 또는 명령줄 인자 사용
        let newPassword = process.argv[2] || process.env.SYSTEM_PASSWORD;
        
        // 환경 변수나 인자로 비밀번호가 없거나 6자 미만이면 입력받기
        if (!newPassword || newPassword.length < 6) {
            if (newPassword && newPassword.length < 6) {
                console.log(`⚠️  환경 변수의 비밀번호가 너무 짧습니다 (최소 6자 필요).`);
            }
            newPassword = await question('새 비밀번호를 입력하세요 (최소 6자): ');
            
            if (!newPassword || newPassword.length < 6) {
                console.error('❌ 비밀번호는 최소 6자 이상이어야 합니다.');
                rl.close();
                process.exit(1);
            }
            
            const confirmPassword = await question('비밀번호를 다시 입력하세요: ');
            
            if (newPassword !== confirmPassword) {
                console.error('❌ 비밀번호가 일치하지 않습니다.');
                rl.close();
                process.exit(1);
            }
        } else {
            console.log(`📝 환경 변수에서 비밀번호를 가져왔습니다: ${newPassword.substring(0, 2)}**`);
        }
        
        if (!newPassword) {
            console.error('❌ 비밀번호가 필요합니다.');
            rl.close();
            process.exit(1);
        }
        
        console.log('\n⏳ 비밀번호 변경 중...\n');
        
        // steve@dashboard.local 사용자 찾기
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ 사용자 목록 조회 실패:', listError.message);
            rl.close();
            process.exit(1);
        }
        
        const user = users.users.find(u => u.email === 'steve@dashboard.local');
        
        if (!user) {
            console.error('❌ steve@dashboard.local 사용자를 찾을 수 없습니다.');
            console.log('   먼저 Supabase 대시보드에서 사용자를 생성하세요.');
            rl.close();
            process.exit(1);
        }
        
        // 비밀번호 업데이트
        const { data, error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );
        
        if (error) {
            console.error('❌ 비밀번호 변경 실패:', error.message);
            rl.close();
            process.exit(1);
        }
        
        console.log('✅ 비밀번호가 성공적으로 변경되었습니다!');
        console.log(`   사용자: ${data.user.email}`);
        console.log(`   변경 시간: ${new Date().toLocaleString('ko-KR')}\n`);
        
        // .env.local 파일 자동 업데이트
        try {
            const envPath = path.join(process.cwd(), '.env.local');
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            // SYSTEM_PASSWORD가 이미 있으면 업데이트, 없으면 추가
            if (envContent.includes('SYSTEM_PASSWORD=')) {
                envContent = envContent.replace(
                    /SYSTEM_PASSWORD=.*/,
                    `SYSTEM_PASSWORD=${newPassword}`
                );
            } else {
                envContent += `\nSYSTEM_PASSWORD=${newPassword}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('✅ .env.local 파일이 자동으로 업데이트되었습니다.\n');
        } catch (error) {
            console.log('⚠️  .env.local 파일 업데이트 실패 (수동으로 추가하세요):');
            console.log(`   SYSTEM_PASSWORD=${newPassword}\n`);
        }
        
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
    } finally {
        rl.close();
    }
}

changePassword();
