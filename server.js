const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ المفاتيح مدخلة مباشرة
const YOUTUBE_API_KEY = "AIzaSyDsyJtRDFxxqkXnDK5RuIwP4e7KP4_BvHo";
const OPENAI_API_KEY = "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";

const OpenAI = require("openai");
const axios = require('axios');
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ الخادم يعمل حالياً على http://localhost:' + PORT);
});

async function searchYouTubeMusic(query) {
  if (!YOUTUBE_API_KEY) {
    console.error("❌ YOUTUBE_API_KEY غير موجود");
    return "عذراً، لا يمكنني استخدام YouTube Music حالياً بسبب غياب مفتاح API.";
  }

  const Youtube_URL = 'https://www.googleapis.com/youtube/v3/search';
  try {
    const response = await axios.get(Youtube_URL, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10',
        maxResults: 3,
        key: YOUTUBE_API_KEY
      }
    });

    const items = response.data.items;
    if (items && items.length > 0) {
      let results = "🎵 نتائج من YouTube Music:\n";
      items.forEach((item, index) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channel = item.snippet.channelTitle;
        results += `${index + 1}. ${title} - ${channel}\nرابط: https://www.youtube.com/watch?v=${videoId}\n\n`;
      });
      return results;
    } else {
      return "لم أجد أي نتائج من YouTube Music.";
    }
  } catch (error) {
    console.error("❌ خطأ في YouTube API:", error.message);
    return "حدث خطأ أثناء الاتصال بـ YouTube Music.";
  }
}

async function askOpenAI(prompt) {
  if (!openai) {
    console.error("❌ OPENAI_API_KEY غير موجود أو غير صالح");
    return "مفتاح OpenAI API غير موجود. لا يمكنني توليد رد.";
  }

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    });
    return chat.choices[0].message.content;
  } catch (error) {
    console.error("❌ خطأ من OpenAI:", error.message);
    if (error.response && error.response.status === 401) {
      return "مفتاح OpenAI غير صالح. يرجى التأكد من صحته.";
    }
    return "حدث خطأ أثناء توليد الرد من الذكاء الاصطناعي.";
  }
}

app.post('/ask-ai', async (req, res) => {
  const userQuery = req.body.query;
  console.log(`📥 استعلام المستخدم: ${userQuery}`);

  let aiResponse;
  const normalizedQuery = userQuery.toLowerCase();

  const youtubeKeywords = [
    "يوتيوب ميوزك", "يوتيوب", "youtube music", "youtube",
    "شغل اغنية", "ابحث عن اغنية", "مقاطع يوتيوب", "فيديو يوتيوب"
  ];
  const isYoutubeQuery = youtubeKeywords.some(keyword => normalizedQuery.includes(keyword));

  if (isYoutubeQuery) {
    let musicQuery = normalizedQuery;
    youtubeKeywords.forEach(keyword => {
      musicQuery = musicQuery.replace(keyword, '');
    });
    musicQuery = musicQuery.replace(/ابحث عن|شغل|اظهر لي|اعرض لي|send to me|what do you know about/g, '').trim();

    if (musicQuery) {
      aiResponse = await searchYouTubeMusic(musicQuery);
    } else {
      aiResponse = "ما الذي تريد أن أبحث عنه في YouTube Music؟";
    }
  } else {
    aiResponse = await askOpenAI(userQuery);
  }

  res.json({ response: aiResponse });
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم جاهز على http://localhost:${PORT}`);
  if (!OPENAI_API_KEY) console.warn('⚠️ تحذير: مفتاح OpenAI API مفقود');
  if (!YOUTUBE_API_KEY) console.warn('⚠️ تحذير: مفتاح YouTube API مفقود');
});