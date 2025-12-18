const express = require('express'); // 1. express를 먼저 가져와야 합니다.
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express(); // 2. app 선언은 여기서 딱 한 번만!
const port = 3000;

// 미들웨어 설정
app.use(cors()); // 모든 도메인 허용
app.use(express.json()); // JSON 데이터 파싱

// 1. 데이터베이스 연결 설정 (Pool 방식)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway 연결 시 필수
  }
});

// 2. API 경로: 모든 멤버 목록 가져오기
app.get('/api/members', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id ASC');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 3. API 경로: 새로운 멤버 추가하기 (POST)
app.post('/api/members', async (req, res) => {
  const { name, email } = req.body;
  try {
    const query = 'INSERT INTO members (name, email) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [name, email]);
    
    res.status(201).json({
      success: true,
      message: '성공적으로 등록되었습니다.',
      newMember: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. 서버 시작
app.listen(port, () => {
  console.log(`🚀 서버가 실행 중입니다: http://localhost:${port}`);
});

// VS Code 에러 방지용 (필요 시 유지)
// export {};