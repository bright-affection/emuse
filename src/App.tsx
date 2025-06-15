import React, { useState, useEffect } from "react";
import axios from "axios";

declare global {
  interface Window {
    Kakao: any;
  }
}

interface Song {
  title: string;
  platform: string;
  url: string;
}

interface ChatMessage {
  type: "user" | "bot";
  text: string;
}

interface EmotionData {
  keywords: string[];
  responses: string[];
  searchTerms: string[];
}

interface EmotionMap {
  [key: string]: EmotionData;
}

interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
  };
}

interface YouTubeResponse {
  items: YouTubeVideo[];
}

const emotionMap: EmotionMap = {
  happy: {
    keywords: ["행복", "기쁨", "즐거움", "신나", "좋아", "웃겨", "재미있", "즐겁"],
    responses: [
      "행복한 기분이신가요? 😊\n기분 좋은 노래를 추천해드릴게요!",
      "즐거운 하루 보내고 계시네요! 🎵\n당신의 기분을 더욱 상승시켜줄 노래를 찾아볼게요.",
    ],
    searchTerms: [
      "happy kpop playlist",
      "feel good korean songs",
      "upbeat kpop songs",
      "energetic korean music",
      "cheerful kpop hits"
    ],
  },
  sad: {
    keywords: ["슬픔", "우울", "힘들", "외로", "그리워", "이별", "눈물", "아파"],
    responses: [
      "지금 힘든 시간을 보내고 계시나요? 😢\n당신의 마음을 위로해줄 노래를 찾아볼게요.",
      "슬픈 감정이 드는군요... 💔\n당신의 마음을 달래줄 노래를 추천해드릴게요.",
    ],
    searchTerms: [
      "korean ballad playlist",
      "sad kpop songs",
      "emotional korean music",
      "healing kpop songs",
      "comfort korean music"
    ],
  },
  angry: {
    keywords: ["화나", "짜증", "분노", "열받", "싫어", "미워", "힘들어", "스트레스"],
    responses: [
      "지금 화가 나시는군요... 😤\n당신의 감정을 해소해줄 노래를 찾아볼게요.",
      "스트레스 받으시는 것 같아요. 💪\n당신의 분노를 해소해줄 노래를 추천해드릴게요.",
    ],
    searchTerms: [
      "korean hip hop playlist",
      "angry kpop songs",
      "powerful korean music",
      "energetic kpop hits",
      "strong korean songs"
    ],
  },
};

// YouTube API 키를 여기에 입력하세요
const YOUTUBE_API_KEY = "AIzaSyDt4ErOT9W-dvSN6xpgmv2KNfE1WQreXiQ";

function App() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { type: "bot", text: "안녕하세요! 기분을 말해주시면 노래를 추천해드릴게요 🎶" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  // 카카오톡 SDK 초기화
  useEffect(() => {
    if (window.Kakao) {
      const kakao = window.Kakao;
      if (!kakao.isInitialized()) {
        kakao.init('YOUR_KAKAO_APP_KEY'); // 여기에 카카오 앱 키를 입력해주세요
      }
    }
  }, []);

  const getRandomItem = <T,>(items: T[]): T => {
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
  };

  const searchYouTube = async (searchTerm: string): Promise<Song | null> => {
    try {
      // 랜덤 숫자를 붙여서 매번 다른 쿼리 생성
      const randomQuery = `${searchTerm} ${Math.floor(Math.random() * 1000)}`;
      const response = await axios.get<YouTubeResponse>(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          randomQuery
        )}&type=video&videoCategoryId=10&maxResults=20&relevanceLanguage=ko&key=${YOUTUBE_API_KEY}`
      );

      const videos = response.data.items;
      if (videos && videos.length > 0) {
        // 제목에 "playlist"가 포함된 비디오 우선 선택
        const playlistVideos = videos.filter(video => 
          video.snippet.title.toLowerCase().includes("playlist")
        );
        
        // 플레이리스트가 있으면 그 중에서 선택, 없으면 전체 결과에서 선택
        const selectedVideos = playlistVideos.length > 0 ? playlistVideos : videos;
        const randomVideo = getRandomItem(selectedVideos);
        
        return {
          title: randomVideo.snippet.title,
          platform: "YouTube",
          url: `https://www.youtube.com/watch?v=${randomVideo.id.videoId}`,
        };
      }
      return null;
    } catch (error) {
      console.error("YouTube API Error:", error);
      return null;
    }
  };

  const copyToClipboard = async () => {
    if (recommendedSongs.length === 0) return;

    const songList = recommendedSongs.map(song => 
      `${song.title}\n${song.url}`
    ).join('\n\n');

    try {
      await navigator.clipboard.writeText(songList);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setChat((prev) => [...prev, { type: "user", text: userMessage }]);

    let found = false;
    for (const [emotion, data] of Object.entries(emotionMap)) {
      if (data.keywords.some((k) => userMessage.toLowerCase().includes(k))) {
        const randomResponse = getRandomItem(data.responses);
        const randomSearchTerm = getRandomItem(data.searchTerms);
        
        setChat((prev) => [...prev, { type: "bot", text: randomResponse }]);

        try {
          const song = await searchYouTube(randomSearchTerm);
          if (song) {
            setRecommendedSongs(prev => [...prev, song]);
            setChat((prev) => [
              ...prev,
              {
                type: "bot",
                text: `추천 노래:\n${song.title}\n${song.url}`,
              },
            ]);
          }
        } catch (error) {
          console.error("Error searching for song:", error);
        }
        
        found = true;
        break;
      }
    }

    if (!found) {
      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: "조금 더 자세히 말씀해 주실 수 있나요? 😊\n지금 어떤 기분이신지 알려주시면 더 좋을 것 같아요.",
        },
      ]);
    }
  };

  const handleReset = () => {
    setChat([]);
    setRecommendedSongs([]);
  };

  const handleMoreSongs = async () => {
    const lastUserMessage = [...chat].reverse().find(msg => msg.type === "user")?.text || "";
    let found = false;

    for (const [emotion, data] of Object.entries(emotionMap)) {
      if (data.keywords.some((k) => lastUserMessage.toLowerCase().includes(k))) {
        const randomSearchTerm = getRandomItem(data.searchTerms);
        try {
          const song = await searchYouTube(randomSearchTerm);
          if (song) {
            setRecommendedSongs(prev => [...prev, song]);
            setChat((prev) => [
              ...prev,
              {
                type: "bot",
                text: `이 곡도 추천드려요! 🎵\n${song.title}\n${song.url}`,
              },
            ]);
          }
        } catch (error) {
          console.error("Error searching for song:", error);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: "죄송합니다. 다른 노래를 찾지 못했어요. 다시 시도해보시겠어요?",
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4 text-center text-black">감정 기반 노래 추천기, EMUSE</h1>
      {showCopiedMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-50">
          클립보드에 복사되었습니다!
        </div>
      )}
      <div className="flex-1 bg-white rounded-xl shadow p-4 overflow-y-auto space-y-2 mb-4 border border-gray-100">
        {chat.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-xl ${
              msg.type === "bot"
                ? "text-left self-start bg-white border border-gray-200"
                : "text-right self-end ml-auto bg-gray-100"
            }`}
            style={{
              maxWidth: '80%',
              width: msg.type === "user" ? 'fit-content' : 'auto',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {msg.text.split("\n").map((line, i) => {
              const trimmed = line.trim();
              const isYouTubeLink =
                trimmed.startsWith("https://www.youtube.com/") ||
                trimmed.startsWith("https://youtu.be/");
              return (
                <p key={i} className="break-words">
                  {isYouTubeLink ? (
                    <div className="flex flex-col gap-2">
                      <a
                        href={trimmed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 px-4 py-2 bg-[#FEE500] text-black rounded-lg hover:bg-[#F4DC00] transition-colors duration-200 text-center"
                        style={{ backgroundColor: "#FEE500" }}
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(trimmed, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        노래 듣기
                      </a>
                      <button
                        onClick={handleMoreSongs}
                        className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                      >
                        다른 노래 추천받기
                      </button>
                      {recommendedSongs.length > 0 && (
                        <button
                          onClick={copyToClipboard}
                          className="inline-block px-4 py-2 bg-[#FEE500] text-black rounded-lg hover:bg-[#F4DC00] transition-colors duration-200"
                        >
                          추천 노래 목록 복사하기
                        </button>
                      )}
                      <button
                        onClick={handleReset}
                        className="inline-block px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                      >
                        처음으로 돌아가기
                      </button>
                    </div>
                  ) : (
                    line
                  )}
                </p>
              );
            })}
          </div>
        ))}
        {isLoading && (
          <div className="p-2 rounded-xl bg-blue-100 text-left self-start">
            노래를 찾고 있어요... 🎵
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          placeholder="지금 기분을 말해보세요!"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
          className="flex-1 border rounded-l-xl p-2 outline-none"
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          className={`px-4 rounded-r-xl ${
            isLoading ? "bg-gray-400" : "bg-blue-500"
          } text-white`}
          disabled={isLoading}
        >
          전송
        </button>
      </div>
    </div>
  );
}

export default App;
