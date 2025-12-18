const cors = require('cors');
const app = express();

app.use(cors()); // 모든 도메인에서의 접속을 허용합니다.

const express = require('express');
const { Pool } = require('pg'); // Client 대신 Pool을 사용합니다 (여러 명 접속 대비)
require('dotenv').config();

const app = express();
const port = 3000;

// 1. 데이터베이스 연결 설정 (Pool 방식)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Railway 연결 시 필수 설정
  }
});

// 2. 미들웨어 설정 (JSON 데이터를 다루기 위함)
app.use(express.json());

// 3. API 경로(Route) 만들기: 모든 멤버 목록 가져오기
app.get('/api/members', async (req, res) => {
  try {
    // DB에서 데이터 조회
    const result = await pool.query('SELECT * FROM members ORDER BY id ASC');
    
    // 브라우저에 결과 전송
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
  }
});

// 4. API 경로 만들기: 새로운 멤버 추가하기 (POST)
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

// 5. 서버 시작
app.listen(port, () => {
  console.log(`🚀 서버가 실행 중입니다: http://localhost:${port}`);
});