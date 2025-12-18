const { Client } = require('pg');
require('dotenv').config();

// Railway 연결 설정
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  // 외부 접속 시 보안 연결(SSL)이 필요할 수 있습니다.
  ssl: {
    rejectUnauthorized: false
  }
});

async function runDatabaseTest() {
  try {
    console.log('🚀 Railway 서버에 연결 시도 중...');
    await client.connect();
    console.log('✅ 연결 성공!');

    // 1. 테이블 만들기 (이미 있으면 만들지 않음)
    console.log('1. 테이블 생성 중...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. 데이터 한 줄 넣기
    console.log('2. 데이터 삽입 중...');
    const insertQuery = 'INSERT INTO members (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING';
    await client.query(insertQuery, ['Railway초보', 'test@example.com']);

    // 3. 데이터 읽어오기
    console.log('3. 데이터 조회 중...');
    const res = await client.query('SELECT * FROM members');
    
    console.log('📊 [조회 결과]');
    console.table(res.rows); // 데이터를 표 형태로 예쁘게 출력합니다.

  } catch (err) {
    console.error('❌ 작업 도중 에러 발생:', err.message);
  } finally {
    // 4. 반드시 연결 종료
    await client.end();
    console.log('🔌 연결이 안전하게 종료되었습니다.');
  }
}

runDatabaseTest();