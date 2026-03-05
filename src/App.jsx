import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plane, Clock, Play, Square, Settings, Award, XCircle, AlertTriangle, Cloud, ShieldAlert, MapPin, ArrowRightLeft, X, Check, Bell, Info, Sun, Gauge, Wind, Compass, Volume2, VolumeX, Moon, Sunset, Sunrise } from 'lucide-react';

export default function App() {
  // 應用程式狀態: 'setup' (設定), 'takeoff' (起飛中), 'flying' (飛行中), 'landing' (降落中), 'finished' (完成), 'failed' (失敗)
  const [appState, setAppState] = useState('setup');
  const [showSeatMap, setShowSeatMap] = useState(false);
  
  // 自訂通知狀態 (簡約美學 Toast)
  const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'info' });
  const toastTimerRef = useRef(null);

  // 觸發自訂通知
  const showToast = useCallback((title, message, type = 'info') => {
    setToast({ visible: true, title, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4500); // 4.5秒後自動隱藏
  }, []);
  
  // 機場資料庫 (包含經緯度以計算真實距離)
  const airports = [
    { code: 'TSA', name: '台北松山', lat: 25.0697, lon: 121.5525 },
    { code: 'TPE', name: '桃園國際', lat: 25.0777, lon: 121.2328 },
    { code: 'RMQ', name: '台中清泉崗', lat: 24.2644, lon: 120.6200 },
    { code: 'KHH', name: '高雄小港', lat: 22.5771, lon: 120.3500 },
    { code: 'MZG', name: '澎湖馬公', lat: 23.5680, lon: 119.6295 },
    { code: 'HUN', name: '花蓮機場', lat: 24.0233, lon: 121.6175 },
    { code: 'OKA', name: '沖繩那霸', lat: 26.1958, lon: 127.6458 },
    { code: 'HKG', name: '香港赤鱲角', lat: 22.3089, lon: 113.9146 },
    { code: 'MNL', name: '馬尼拉', lat: 14.5090, lon: 121.0194 },
    { code: 'ICN', name: '首爾仁川', lat: 37.4692, lon: 126.4505 },
    { code: 'KIX', name: '大阪關西', lat: 34.4347, lon: 135.2441 },
    { code: 'NRT', name: '東京成田', lat: 35.7647, lon: 140.3863 },
    { code: 'BKK', name: '曼谷蘇凡納布', lat: 13.6811, lon: 100.7472 },
    { code: 'SIN', name: '新加坡樟宜', lat: 1.3592, lon: 103.9893 },
    { code: 'SYD', name: '雪梨', lat: -33.9461, lon: 151.1772 },
    { code: 'LAX', name: '洛杉磯', lat: 33.9416, lon: -118.4085 }
  ];

  // 計算兩點距離 (Haversine formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 飛行設定
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [strictMode, setStrictMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true); // 預設開啟螢幕常亮
  const [audioEnabled, setAudioEnabled] = useState(true); // 預設開啟環境音與廣播
  const [volume, setVolume] = useState(0.5); // 新增：音量狀態
  const [departure, setDeparture] = useState('TSA');
  const [destination, setDestination] = useState('MZG');
  const [flightDistance, setFlightDistance] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState({ id: '6A', class: 'economy' });
  
  // 倒數計時與狀態
  const [timeRemaining, setTimeRemaining] = useState(0);
  const wakeLockRef = useRef(null); // 用於儲存螢幕喚醒鎖
  
  // 新增：緊急降落長按狀態
  const [abortProgress, setAbortProgress] = useState(0);
  const abortTimerRef = useRef(null);
  
  // 真實時間 (用於計算日夜)
  const [realTime, setRealTime] = useState(new Date());

  // 音效控制 Refs
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  
  // 統計數據
  const [stats, setStats] = useState({
    successfulFlights: 0,
    totalFlightMinutes: 0,
    totalMileage: 0
  });

  // 艙等選項與樣式對應
  const cabinOptions = {
    economy: { label: '經濟艙', multiplier: 1, icon: '💺', color: 'bg-slate-500', hover: 'hover:bg-slate-400', active: 'bg-slate-300' },
    business: { label: '商務艙', multiplier: 1.5, icon: '🥂', color: 'bg-sky-600', hover: 'hover:bg-sky-500', active: 'bg-sky-300' },
    first: { label: '頭等艙', multiplier: 2, icon: '👑', color: 'bg-amber-600', hover: 'hover:bg-amber-500', active: 'bg-amber-300' }
  };

  // 初始化通知狀態
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // 切換通知權限
  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('系統提示', '您的裝置或瀏覽器不支援系統通知', 'error');
      return;
    }
    
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      showToast('通知已關閉', '您將不會收到系統層級的推播', 'info');
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        showToast('推播已啟用', '您將在航班抵達或發生意外時收到通知', 'success');
        new Notification('✈️ 系統通知已啟用', { body: '您將在航班抵達或發生意外時收到真實推播。' });
      } else {
        showToast('權限被拒', '請在瀏覽器設定中允許通知權限', 'error');
      }
    }
  };

  // --- 語音與環境音 (Web Audio API & Speech Synthesis) ---
  const playAnnouncement = useCallback((zhText, enText) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // 清除先前的語音佇列
    
    // 中文廣播
    const zhUtterance = new SpeechSynthesisUtterance(zhText);
    zhUtterance.lang = 'zh-TW';
    zhUtterance.rate = 0.9;
    zhUtterance.volume = volume; // 應用音量
    
    // 英文廣播
    const enUtterance = new SpeechSynthesisUtterance(enText);
    enUtterance.lang = 'en-US';
    enUtterance.rate = 0.9;
    enUtterance.volume = volume; // 應用音量
    
    window.speechSynthesis.speak(zhUtterance);
    window.speechSynthesis.speak(enUtterance);
  }, [audioEnabled, volume]);

  const startCabinNoise = useCallback(() => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (noiseSourceRef.current) return;
      
      // 生成白噪音 Buffer
      const bufferSize = audioCtxRef.current.sampleRate * 2; // 2秒的迴圈
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; 
      }
      
      const noiseSource = audioCtxRef.current.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      
      // 使用低通濾波器將白噪音轉為沉悶的機艙轟鳴聲 (近似棕噪音)
      const filter = audioCtxRef.current.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350; 
      
      // 音量控制節點
      const targetVolume = Math.max(volume * 0.4, 0.0001); // 0.4為最大基礎音量
      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.setValueAtTime(0.0001, audioCtxRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(targetVolume, audioCtxRef.current.currentTime + 3); // 3秒淡入
      gainNodeRef.current = gainNode;
      
      // 連接音訊節點
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      
      noiseSource.start();
      noiseSourceRef.current = noiseSource;
    } catch (err) {
      console.warn("Audio Context init failed", err);
    }
  }, [audioEnabled, volume]);

  const stopCabinNoise = useCallback(() => {
    if (noiseSourceRef.current && audioCtxRef.current && gainNodeRef.current) {
      try {
        // 1.5秒淡出
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 1.5); 
        const currentNoise = noiseSourceRef.current;
        setTimeout(() => {
          try {
            currentNoise.stop();
            currentNoise.disconnect();
          } catch(e) {}
        }, 1500);
        noiseSourceRef.current = null;
      } catch(e) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current = null;
      }
    }
  }, []);

  // 元件卸載時清理音效
  useEffect(() => {
    return () => {
      stopCabinNoise();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [stopCabinNoise]);

  // 監聽音量變化，動態調整飛行中的環境音量
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const targetVolume = Math.max(volume * 0.4, 0.0001);
      // 使用 setTargetAtTime 進行平滑過渡 (不會導致音效重啟)
      gainNodeRef.current.gain.setTargetAtTime(targetVolume, audioCtxRef.current.currentTime, 0.1);
    }
  }, [volume]);


  // --- 螢幕常亮 (Wake Lock API) 控制 ---
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && keepAwake) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request failed:', err.message);
      }
    }
  }, [keepAwake]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current !== null) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.warn('Wake Lock release failed:', err.message);
      }
    }
  }, []);

  // 根據應用程式狀態控制螢幕喚醒
  useEffect(() => {
    if (['takeoff', 'flying', 'landing'].includes(appState) && keepAwake) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock(); // 元件卸載時釋放
  }, [appState, keepAwake, requestWakeLock, releaseWakeLock]);

  // 處理切換視窗後 Wake Lock 可能被系統自動釋放的問題
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && ['takeoff', 'flying', 'landing'].includes(appState) && keepAwake) {
        requestWakeLock(); // 切回視窗時重新請求喚醒鎖
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, keepAwake, requestWakeLock]);


  // 飛機座位排列設計 (俯視圖佈局)
  const planeLayout = [
    { row: 1, class: 'first', layout: ['A', 'space', 'K'] },
    { row: 2, class: 'first', layout: ['A', 'space', 'K'] },
    { type: 'divider' },
    { row: 3, class: 'business', layout: ['A', 'C', 'aisle', 'H', 'K'] },
    { row: 4, class: 'business', layout: ['A', 'C', 'aisle', 'H', 'K'] },
    { row: 5, class: 'business', layout: ['A', 'C', 'aisle', 'H', 'K'] },
    { type: 'divider' },
    { row: 6, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 7, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 8, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 9, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 10, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 11, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
    { row: 12, class: 'economy', layout: ['A', 'B', 'C', 'aisle', 'H', 'J', 'K'] },
  ];

  // 監聽航線變更，自動計算真實飛行時間
  useEffect(() => {
    const dep = airports.find(a => a.code === departure);
    const dest = airports.find(a => a.code === destination);
    
    if (dep && dest) {
      if (dep.code === dest.code) {
        setDurationMinutes(0);
        setFlightDistance(0);
      } else {
        const dist = getDistance(dep.lat, dep.lon, dest.lat, dest.lon);
        setFlightDistance(Math.round(dist));
        const mins = Math.round((dist / 800) * 60 + 30);
        setDurationMinutes(mins);
      }
    }
  }, [departure, destination]);

  // 處理起飛與降落的自動跳轉流程
  useEffect(() => {
    let phaseTimer;
    if (appState === 'takeoff') {
      phaseTimer = setTimeout(() => {
        setAppState('flying');
      }, 3500); // 3.5秒起飛過渡期
    } else if (appState === 'landing') {
      phaseTimer = setTimeout(() => {
        setAppState('finished');
        
        stopCabinNoise();
        playAnnouncement(
          "各位旅客，我們已經順利抵達目的地，感謝您的搭乘。",
          "Ladies and gentlemen, we have arrived at our destination. Thank you for flying with us."
        );
        
        // 降落完成時進行哩程結算
        const currentCabinMultiplier = cabinOptions[selectedSeat.class]?.multiplier || 1;
        const earnedMileage = Math.round(durationMinutes * currentCabinMultiplier);
        
        setStats(prev => ({
          successfulFlights: prev.successfulFlights + 1,
          totalFlightMinutes: prev.totalFlightMinutes + durationMinutes,
          totalMileage: (prev.totalMileage || 0) + earnedMileage
        }));
        
        showToast('順利抵達目的地', `成功完成 ${durationMinutes} 分鐘專注，獲得 ${earnedMileage} 哩程。`, 'success');

        if (notificationsEnabled && 'Notification' in window) {
          new Notification('🛬 順利抵達目的地！', { body: `您成功完成了 ${durationMinutes} 分鐘的專注飛行，獲得 ${earnedMileage} 哩程。` });
        }
      }, 4000); // 4秒降落過渡期
    }
    return () => clearTimeout(phaseTimer);
  }, [appState, durationMinutes, selectedSeat.class, notificationsEnabled, showToast, stopCabinNoise, playAnnouncement]);

  // 嚴格模式：監聽畫面可見度
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 只要是在起飛、飛行、降落的過程中切換視窗，都判定為失敗
      const isActiveFlightPhase = ['takeoff', 'flying', 'landing'].includes(appState);
      
      if (document.hidden && isActiveFlightPhase && strictMode) {
        setAppState('failed');
        stopCabinNoise();
        playAnnouncement("警告，航班發生意外，飛行中斷。", "Warning. Flight emergency. Mission aborted.");
        showToast('航班發生意外', '您離開了駕駛艙（切換視窗），導致飛行中斷。', 'error');
        if (notificationsEnabled && 'Notification' in window) {
          new Notification('💥 航班發生意外！', { body: '您離開了駕駛艙（切換視窗），導致飛行中斷。' });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, strictMode, notificationsEnabled, showToast, stopCabinNoise, playAnnouncement]);

  // 計時器邏輯
  useEffect(() => {
    let interval;
    if (appState === 'flying' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (appState === 'flying' && timeRemaining === 0) {
      // 時間到，不直接結束，進入降落階段
      setAppState('landing');
      playAnnouncement(
        "各位旅客，航班即將降落，請準備結束手邊的工作。",
        "Ladies and gentlemen, we are preparing for landing. Please wrap up your work."
      );
    }
    return () => clearInterval(interval);
  }, [appState, timeRemaining, playAnnouncement]);

  const startFlight = () => {
    setTimeRemaining(durationMinutes * 60);
    setAppState('takeoff'); // 從起飛狀態開始
    startCabinNoise();
    playAnnouncement(
      "各位旅客您好，歡迎登機，航班即將起飛，請繫好安全帶，準備開始專注。",
      "Ladies and gentlemen, welcome aboard. We are about to take off. Please fasten your seatbelts and get ready to focus."
    );
  };

  // 執行真正的緊急降落邏輯
  const executeAbort = useCallback(() => {
    setAppState('failed');
    stopCabinNoise();
    playAnnouncement("警告，航班緊急迫降，飛行中斷。", "Warning. Emergency landing. Mission aborted.");
    setAbortProgress(0);
  }, [stopCabinNoise, playAnnouncement]);

  // 開始長按
  const handleAbortStart = () => {
    setAbortProgress(0);
    const interval = 50; // 每 50 毫秒更新一次畫面
    const duration = 2000; // 需長按 2 秒 (2000ms)
    const step = (interval / duration) * 100;

    abortTimerRef.current = setInterval(() => {
      setAbortProgress(prev => {
        if (prev + step >= 100) {
          clearInterval(abortTimerRef.current);
          executeAbort();
          return 100;
        }
        return prev + step;
      });
    }, interval);
  };

  // 結束或中斷長按
  const handleAbortEnd = () => {
    if (abortTimerRef.current) {
      clearInterval(abortTimerRef.current);
    }
    setAbortProgress(0);
  };

  // 元件卸載時清理計時器
  useEffect(() => {
    return () => {
      if (abortTimerRef.current) clearInterval(abortTimerRef.current);
    };
  }, []);

  const resetApp = () => {
    setAppState('setup');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPercent = ['flying', 'landing'].includes(appState)
    ? ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100 
    : 0;

  // 每秒更新現實時間
  useEffect(() => {
    const timer = setInterval(() => setRealTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 計算飛機當前位置與當地時間 (符合現實) ---
  const depApt = airports.find(a => a.code === departure) || airports[0];
  const destApt = airports.find(a => a.code === destination) || airports[0];
  
  const currentLat = depApt.lat + (destApt.lat - depApt.lat) * (progressPercent / 100);
  const currentLon = depApt.lon + (destApt.lon - depApt.lon) * (progressPercent / 100);

  // 以經度推算當地平太陽時 (每15度1小時)
  const utcHour = realTime.getUTCHours() + realTime.getUTCMinutes() / 60 + realTime.getUTCSeconds() / 3600;
  const localSolarHour = (utcHour + currentLon / 15 + 24) % 24;

  const localHourInt = Math.floor(localSolarHour);
  const localMinuteInt = Math.floor((localSolarHour - localHourInt) * 60);
  const localTimeStr = `${localHourInt.toString().padStart(2, '0')}:${localMinuteInt.toString().padStart(2, '0')}`;

  // 判斷日夜階段
  let skyPhase = 'day';
  if (localSolarHour >= 6 && localSolarHour < 17.5) skyPhase = 'day';
  else if (localSolarHour >= 17.5 && localSolarHour < 18.5) skyPhase = 'dusk';
  else if (localSolarHour >= 5 && localSolarHour < 6) skyPhase = 'dawn';
  else skyPhase = 'night';

  const skyGradients = {
    day: 'from-blue-500 to-sky-300',
    dusk: 'from-indigo-800 via-purple-600 to-orange-500',
    night: 'from-slate-900 via-indigo-950 to-slate-950',
    dawn: 'from-slate-800 via-indigo-600 to-amber-500'
  };

  const SkyIcon = skyPhase === 'day' ? Sun : skyPhase === 'night' ? Moon : skyPhase === 'dusk' ? Sunset : Sunrise;
  const skyIconColor = skyPhase === 'day' ? 'text-amber-400' : skyPhase === 'night' ? 'text-indigo-300' : 'text-orange-400';

  // 靜態生成星空 (避免每次 re-render 重新洗牌)
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 4}s`,
      duration: `${Math.random() * 3 + 2}s`
    }));
  }, []);

  // --- 新增：視覺化儀表板數據計算 ---
  // 貝茲曲線點計算 (用於繪製動態飛行軌跡)
  const getBezierPoint = (t) => {
    const p0 = { x: 30, y: 90 };
    const p1 = { x: 200, y: -10 };
    const p2 = { x: 370, y: 90 };
    
    // 計算二次貝茲曲線 X/Y
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    
    // 計算切線角度 (為了讓飛機圖標轉向)
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    return { x, y, angle };
  };

  const planePos = getBezierPoint(progressPercent / 100);
  
  // 高度計算 (模擬起飛、巡航、降落的拋物線，峰值為 35000 呎)
  const currentAltitude = Math.round(Math.sin((progressPercent / 100) * Math.PI) * 35000);
  
  // 速度計算 (模擬平滑起步與減速)
  const currentSpeed = Math.round(
    progressPercent === 0 ? 0 :
    progressPercent < 10 ? (progressPercent / 10) * 850 :
    progressPercent > 90 ? ((100 - progressPercent) / 10) * 850 :
    850 + Math.random() * 6 - 3 // 巡航時微幅抖動 (亂流模擬)
  );

  // 已飛距離
  const flownDistance = Math.round(flightDistance * (progressPercent / 100));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* 飛行動畫背景與跑道特效 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        /* 原有的雲朵漂浮 */
        @keyframes drift {
          0% { transform: translateX(100vw); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateX(-20vw); opacity: 0; }
        }
        .animate-drift-slow { animation: drift 25s linear infinite; }
        .animate-drift-medium { animation: drift 18s linear infinite; }
        .animate-drift-fast { animation: drift 12s linear infinite; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-10px) rotate(45deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }

        /* 新增：起飛與降落的跑道 */
        @keyframes runway-move {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-80px); }
        }
        .animate-runway { animation: runway-move 0.25s linear infinite; }

        /* 新增：飛機起飛姿態 */
        @keyframes takeoff-plane {
          0% { transform: translate(-80px, 40px) rotate(45deg); }
          30% { transform: translate(-20px, 40px) rotate(45deg); }
          60% { transform: translate(20px, 20px) rotate(25deg); } 
          100% { transform: translate(120px, -80px) rotate(15deg); opacity: 0; }
        }
        .animate-takeoff-plane { animation: takeoff-plane 3.5s ease-in forwards; }
        
        /* 新增：飛機降落姿態 */
        @keyframes landing-plane {
          0% { transform: translate(-120px, -80px) rotate(75deg); opacity: 0; }
          40% { transform: translate(-20px, 20px) rotate(60deg); opacity: 1; }
          70% { transform: translate(20px, 40px) rotate(45deg); }
          100% { transform: translate(80px, 40px) rotate(45deg); }
        }
        .animate-landing-plane { animation: landing-plane 4s ease-out forwards; }

        /* 新增：星空閃爍 */
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        .animate-twinkle { animation: twinkle linear infinite; }
      `}} />

      {/* --- 簡約美學通知 (Toast) --- */}
      <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          toast.visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-slate-800/85 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl p-4 flex items-start gap-3 min-w-[320px] max-w-md">
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check size={18} /></div>}
            {toast.type === 'error' && <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center"><AlertTriangle size={18} /></div>}
            {toast.type === 'info' && <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center"><Info size={18} /></div>}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-200">{toast.title}</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="shrink-0 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-full transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 飛行階段的全域背景 (起飛/飛行/降落皆顯示) */}
      {['takeoff', 'flying', 'landing'].includes(appState) && (
        <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-b ${skyGradients[skyPhase]} transition-colors duration-[3000ms]`}>
          
          {/* 星空 (僅夜晚、黃昏、黎明顯示) */}
          <div className={`absolute inset-0 transition-opacity duration-[3000ms] ${['night', 'dusk', 'dawn'].includes(skyPhase) ? 'opacity-100' : 'opacity-0'}`}>
            {stars.map(star => (
              <div 
                key={star.id} 
                className="absolute bg-white rounded-full animate-twinkle"
                style={{
                  top: star.top, left: star.left, width: star.size, height: star.size,
                  animationDelay: star.delay, animationDuration: star.duration
                }}
              />
            ))}
          </div>

          <div className={`absolute top-1/4 left-0 transition-colors duration-1000 ${skyPhase === 'night' ? 'text-indigo-200/5' : 'text-white/40'} animate-drift-slow`} style={{ animationDelay: '0s' }}><Cloud size={120} /></div>
          <div className={`absolute top-1/3 left-0 transition-colors duration-1000 ${skyPhase === 'night' ? 'text-indigo-200/5' : 'text-white/30'} animate-drift-medium`} style={{ animationDelay: '-5s' }}><Cloud size={80} /></div>
          <div className={`absolute top-2/3 left-0 transition-colors duration-1000 ${skyPhase === 'night' ? 'text-indigo-200/5' : 'text-white/50'} animate-drift-fast`} style={{ animationDelay: '-2s' }}><Cloud size={160} /></div>
          <div className={`absolute top-1/2 left-0 transition-colors duration-1000 ${skyPhase === 'night' ? 'text-indigo-200/5' : 'text-white/20'} animate-drift-slow`} style={{ animationDelay: '-12s' }}><Cloud size={100} /></div>
        </div>
      )}

      {/* --- 座位選擇 Modal (覆蓋層) --- */}
      {showSeatMap && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl shadow-2xl flex flex-col h-[85vh] overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plane size={20} className="text-sky-400" /> 選擇座位
              </h2>
              <button onClick={() => setShowSeatMap(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - 飛機俯視圖 */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-950 relative scroll-smooth">
              
              {/* 圖例說明 */}
              <div className="flex justify-center gap-4 mb-8 text-xs font-medium text-slate-400 bg-slate-900 py-2 px-4 rounded-full border border-slate-800 sticky top-0 z-20 shadow-lg">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-600"></div> 頭等艙</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-sky-600"></div> 商務艙</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-500"></div> 經濟艙</div>
              </div>

              {/* 機頭 */}
              <div className="w-48 h-24 border-t-4 border-l-4 border-r-4 border-slate-700 rounded-t-[100px] mb-[-4px] relative bg-slate-800/20">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-4 bg-slate-700 rounded-full opacity-50"></div>
              </div>

              {/* 機身與座位 */}
              <div className="w-full max-w-[280px] border-l-4 border-r-4 border-slate-700 bg-slate-800/20 px-2 py-4 shadow-inner">
                {planeLayout.map((row, index) => {
                  if (row.type === 'divider') {
                    return <div key={`div-${index}`} className="w-full h-px bg-slate-700/50 my-4"></div>;
                  }

                  const cabinStyle = cabinOptions[row.class];

                  return (
                    <div key={row.row} className="flex justify-center items-center mb-2">
                      <span className="w-6 text-[10px] text-slate-500 font-mono text-right mr-2">{row.row}</span>
                      
                      <div className="flex justify-center flex-1">
                        {row.layout.map((seat, i) => {
                          if (seat === 'space') return <div key={i} className="w-10"></div>;
                          if (seat === 'aisle') return <div key={i} className="w-6"></div>;
                          
                          const seatId = `${row.row}${seat}`;
                          const isSelected = selectedSeat.id === seatId;
                          
                          // 計算座位的寬度以適應不同艙等
                          const seatWidth = row.class === 'first' ? 'w-10' : row.class === 'business' ? 'w-8' : 'w-7';
                          
                          return (
                            <button 
                              key={i}
                              onClick={() => setSelectedSeat({ id: seatId, class: row.class })}
                              title={`${seatId} (${cabinStyle.label})`}
                              className={`
                                ${seatWidth} h-8 mx-0.5 rounded-t-lg rounded-b-sm border-b-2 flex items-center justify-center text-[10px] font-bold transition-all relative
                                ${isSelected 
                                  ? `${cabinStyle.active} border-white text-slate-900 scale-110 z-10 shadow-[0_0_15px_rgba(255,255,255,0.3)]` 
                                  : `${cabinStyle.color} border-slate-900/50 text-white/80 ${cabinStyle.hover} hover:scale-105`
                                }
                              `}
                            >
                              {isSelected ? <Check size={12} strokeWidth={4} /> : seat}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-6 ml-2"></span>
                    </div>
                  );
                })}
              </div>

              {/* 機尾 */}
              <div className="w-full max-w-[280px] h-16 border-b-4 border-l-4 border-r-4 border-slate-700 rounded-b-[60px] mt-[-4px] bg-slate-800/20"></div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <button 
                onClick={() => setShowSeatMap(false)}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                確認座位 {selectedSeat.id}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- 主視窗 --- */}
      <div className={`relative z-10 w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl border ${['takeoff', 'flying', 'landing'].includes(appState) ? 'border-sky-400/30 shadow-sky-900/50' : 'border-slate-700'} p-8 transition-all duration-500`}>
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Plane className={`text-sky-400 ${['takeoff', 'flying', 'landing'].includes(appState) ? 'animate-pulse' : ''} transform rotate-45`} size={28} />
            <h1 className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-500">
              專注飛行
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full">
            <Award size={16} className="text-amber-400" />
            <span>{stats.totalMileage || 0} 哩</span>
          </div>
        </div>

        {/* --- 狀態：設定 --- */}
        {appState === 'setup' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            
            {/* 航線設定 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <MapPin size={16} /> 航線設定 (真實點對點飛行)
              </label>
              <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-700">
                <select 
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="w-full bg-slate-800 text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-lg py-2 appearance-none font-bold"
                >
                  {airports.map(apt => (
                    <option key={`dep-${apt.code}`} value={apt.code}>{apt.name}</option>
                  ))}
                </select>
                
                <button 
                  onClick={() => {
                    const temp = departure;
                    setDeparture(destination);
                    setDestination(temp);
                  }}
                  className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shrink-0"
                  title="反轉航線"
                >
                  <ArrowRightLeft size={16} />
                </button>

                <select 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-800 text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-lg py-2 appearance-none font-bold"
                >
                  {airports.map(apt => (
                    <option key={`dest-${apt.code}`} value={apt.code}>{apt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 真實飛行時間顯示面板 */}
            <div className="bg-sky-900/20 border border-sky-500/30 p-4 rounded-xl text-center space-y-2">
              <div className="text-sm text-sky-200/80 font-medium">預計飛行時間 (專注時長)</div>
              {durationMinutes > 0 ? (
                <>
                  <div className="text-3xl font-mono font-bold text-white drop-shadow-md">
                    {Math.floor(durationMinutes / 60) > 0 && `${Math.floor(durationMinutes / 60)} 小時 `}
                    {durationMinutes % 60} 分鐘
                  </div>
                  <div className="text-xs text-sky-300/60">
                    航線直線距離約 {flightDistance.toLocaleString()} 公里
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold text-rose-400 py-2">
                  無法起飛：請選擇不同的目的地
                </div>
              )}
            </div>

            {/* 座位選擇入口 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <span className="text-base">{cabinOptions[selectedSeat.class].icon}</span> 座位配置與哩程加成
              </label>
              <button 
                onClick={() => setShowSeatMap(true)}
                className="w-full flex items-center justify-between bg-slate-900/50 hover:bg-slate-800 p-4 rounded-xl border border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-slate-900 ${cabinOptions[selectedSeat.class].active}`}>
                    {selectedSeat.id}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-200">{cabinOptions[selectedSeat.class].label}</div>
                    <div className="text-xs text-slate-400">獲得哩程 x{cabinOptions[selectedSeat.class].multiplier}</div>
                  </div>
                </div>
                <div className="text-sky-400 text-sm font-medium group-hover:underline">
                  更改座位
                </div>
              </button>
            </div>

            {/* 系統設定：嚴格模式、常亮與通知 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Settings size={16} /> 飛行系統設定
              </label>
              
              <div className="bg-slate-900/50 rounded-xl border border-slate-700 divide-y divide-slate-700/50 shadow-inner">
                {/* 嚴格模式 */}
                <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className={strictMode ? 'text-rose-400' : 'text-slate-500'} size={20} />
                    <div>
                      <div className="text-sm font-medium text-slate-200">嚴格模式</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">離開畫面即判定空難</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={strictMode}
                      onChange={() => setStrictMode(!strictMode)}
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {/* 螢幕常亮 */}
                <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Sun className={keepAwake ? 'text-amber-400' : 'text-slate-500'} size={20} />
                    <div>
                      <div className="text-sm font-medium text-slate-200">保持螢幕常亮</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">飛行期間防止裝置進入休眠</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={keepAwake}
                      onChange={() => {
                        const newState = !keepAwake;
                        setKeepAwake(newState);
                        showToast(
                          newState ? '已開啟常亮' : '已關閉常亮', 
                          newState ? '飛行期間將保持螢幕亮起' : '螢幕將會依照系統設定自動休眠', 
                          'info'
                        );
                      }}
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* 機艙廣播與環境音 */}
                <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    {audioEnabled ? <Volume2 className="text-sky-400" size={20} /> : <VolumeX className="text-slate-500" size={20} />}
                    <div>
                      <div className="text-sm font-medium text-slate-200">機艙廣播與環境音</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">播放雙語廣播與白噪音</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={audioEnabled}
                      onChange={() => setAudioEnabled(!audioEnabled)}
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {/* 系統通知 */}
                <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30 rounded-b-xl">
                  <div className="flex items-center gap-3">
                    <Bell className={notificationsEnabled ? 'text-sky-400' : 'text-slate-500'} size={20} />
                    <div>
                      <div className="text-sm font-medium text-slate-200">系統推播通知</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">抵達或發生意外時發送真實通知</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notificationsEnabled}
                      onChange={toggleNotifications}
                    />
                    <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={startFlight}
              disabled={durationMinutes === 0}
              className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform ${
                durationMinutes > 0 
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-blue-900/50 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Plane className="transform rotate-45" size={20} />
              {durationMinutes > 0 ? '準備起飛 (開始專注)' : '航班停飛 (重新選擇)'}
            </button>
          </div>
        )}

        {/* --- 狀態：起飛 (Takeoff Phase) --- */}
        {appState === 'takeoff' && (
          <div className="space-y-8 py-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 relative min-h-[250px] rounded-2xl overflow-hidden bg-slate-900/50">
            {/* 跑道特效 */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
              <div className="absolute bottom-12 w-[200%] h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.6)_20px,rgba(255,255,255,0.6)_60px)] animate-runway"></div>
            </div>
            
            <div className="relative z-10 animate-takeoff-plane">
              <Plane className="text-white drop-shadow-[0_0_20px_rgba(56,189,248,1)]" size={72} />
            </div>

            <div className="text-center space-y-2 relative z-10 mt-12 w-full">
              <div className="text-2xl font-bold text-white tracking-widest animate-pulse">
                🛫 準備起飛
              </div>
              <div className="text-sm text-sky-200/80 bg-slate-800/80 rounded-full py-1 px-4 inline-block backdrop-blur-sm border border-slate-600">
                請繫好安全帶，即將進入專注模式
              </div>
            </div>
          </div>
        )}

        {/* --- 狀態：降落 (Landing Phase) --- */}
        {appState === 'landing' && (
          <div className="space-y-8 py-10 flex flex-col items-center justify-center animate-in fade-in duration-500 relative min-h-[250px] rounded-2xl overflow-hidden bg-slate-900/50">
            {/* 跑道特效 */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
              <div className="absolute bottom-12 w-[200%] h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.6)_20px,rgba(255,255,255,0.6)_60px)] animate-runway"></div>
            </div>
            
            <div className="relative z-10 animate-landing-plane">
              <Plane className="text-white drop-shadow-[0_0_20px_rgba(56,189,248,1)]" size={72} />
            </div>

            <div className="text-center space-y-2 relative z-10 mt-12 w-full">
              <div className="text-2xl font-bold text-white tracking-widest animate-pulse">
                🛬 即將降落
              </div>
              <div className="text-sm text-sky-200/80 bg-slate-800/80 rounded-full py-1 px-4 inline-block backdrop-blur-sm border border-slate-600">
                航程即將結束，請準備回到現實
              </div>
            </div>
          </div>
        )}

        {/* --- 狀態：飛行中 --- */}
        {appState === 'flying' && (
          <div className="space-y-8 py-4 flex flex-col items-center animate-in fade-in zoom-in duration-700">
            
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sky-300/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              <div className="absolute inset-4 rounded-full border border-sky-300/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.5s' }}></div>
              <Plane className="text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] animate-float" size={64} />
            </div>

            <div className="text-center space-y-2">
              <div className="text-xs tracking-widest text-sky-200 uppercase font-semibold">FLIGHT IN PROGRESS</div>
              <div className="text-6xl font-mono font-bold text-white drop-shadow-md tracking-tight">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-sky-100/80 flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 bg-slate-800/80 rounded text-xs border border-sky-400/30 text-amber-300 flex items-center gap-1">
                  {cabinOptions[selectedSeat.class].icon} {selectedSeat.id}
                </span>
                <span>{airports.find(a => a.code === departure)?.name} ✈️ {airports.find(a => a.code === destination)?.name}</span>
              </div>
            </div>

            {/* --- 升級版：視覺化飛行軌跡與儀表板 --- */}
            <div className="w-full mt-2 bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-md shadow-inner">
              
              {/* 飛行軌跡圖 (SVG) */}
              <div className="relative w-full h-[100px] mb-4">
                <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible drop-shadow-md">
                  {/* 虛線預定軌跡 */}
                  <path 
                    d="M 30 90 Q 200 -10 370 90" 
                    fill="none" 
                    stroke="rgba(148, 163, 184, 0.3)" 
                    strokeWidth="2" 
                    strokeDasharray="6 6" 
                  />
                  {/* 已飛過軌跡 (使用漸層) */}
                  <defs>
                    <linearGradient id="flightPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  {/* 遮罩實現進度條效果 */}
                  <clipPath id="progressClip">
                    <rect x="0" y="-30" width={(progressPercent / 100) * 400} height="160" />
                  </clipPath>
                  <path 
                    d="M 30 90 Q 200 -10 370 90" 
                    fill="none" 
                    stroke="url(#flightPathGrad)" 
                    strokeWidth="4" 
                    clipPath="url(#progressClip)"
                  />
                  
                  {/* 起點與終點標記 */}
                  <circle cx="30" cy="90" r="4" fill="#38bdf8" className="animate-[ping_2s_infinite]" />
                  <circle cx="370" cy="90" r="4" fill="#94a3b8" />
                  <text x="30" y="112" fontSize="11" fill="#94a3b8" textAnchor="middle">{departure}</text>
                  <text x="370" y="112" fontSize="11" fill="#94a3b8" textAnchor="middle">{destination}</text>

                  {/* 動態飛機圖標 */}
                  <g transform={`translate(${planePos.x}, ${planePos.y}) rotate(${planePos.angle})`}>
                    <circle cx="0" cy="0" r="16" fill="rgba(56, 189, 248, 0.15)" className="animate-[ping_1.5s_infinite]" />
                    <g transform="translate(-10, -10) rotate(45, 10, 10)">
                      <Plane size={20} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </g>
                  </g>
                </svg>
              </div>

              {/* 數位儀表板 */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-slate-800/80 rounded-xl p-2 text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Compass size={12} />
                    <span className="text-[10px] uppercase">已飛距離</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-sky-300">{flownDistance.toLocaleString()} <span className="text-[9px] text-slate-500">km</span></div>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-2 text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Gauge size={12} />
                    <span className="text-[10px] uppercase">對地速度</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-emerald-400">{currentSpeed.toLocaleString()} <span className="text-[9px] text-slate-500">km/h</span></div>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-2 text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Wind size={12} />
                    <span className="text-[10px] uppercase">飛行高度</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-amber-300">{currentAltitude.toLocaleString()} <span className="text-[9px] text-slate-500">ft</span></div>
                </div>
                <div className="bg-slate-800/80 rounded-xl p-2 text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <SkyIcon size={12} className={skyIconColor} />
                    <span className="text-[10px] uppercase">當地時間</span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-slate-200">{localTimeStr}</div>
                </div>
              </div>
            </div>

            {/* 新增：音量控制 (飛行中可調) */}
            {audioEnabled && (
              <div className="w-full flex items-center gap-4 mt-4 bg-slate-900/60 p-3 px-5 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-inner">
                {volume === 0 ? <VolumeX size={18} className="text-slate-500" /> : <Volume2 size={18} className="text-sky-400" />}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <span className="text-xs font-mono text-slate-400 w-8 text-right">{Math.round(volume * 100)}%</span>
              </div>
            )}

            <button
              onMouseDown={handleAbortStart}
              onMouseUp={handleAbortEnd}
              onMouseLeave={handleAbortEnd}
              onTouchStart={handleAbortStart}
              onTouchEnd={handleAbortEnd}
              className="relative mt-6 overflow-hidden text-slate-300 hover:text-rose-400 text-sm flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-rose-500/50 transition-colors select-none"
            >
              {/* 長按進度條背景 */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-rose-500/20 transition-all ease-linear"
                style={{ width: `${abortProgress}%` }}
              />
              <AlertTriangle size={16} className={`relative z-10 ${abortProgress > 0 ? "text-rose-400 animate-pulse" : ""}`} />
              <span className="relative z-10 font-medium">
                {abortProgress > 0 ? '長按以放棄...' : '緊急降落 (長按放棄)'}
              </span>
            </button>
          </div>
        )}

        {/* --- 狀態：完成 --- */}
        {appState === 'finished' && (
          <div className="space-y-6 text-center animate-in zoom-in duration-300 py-6">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Award size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-emerald-400">順利抵達目的地！</h2>
              <p className="text-slate-300">您成功完成了 {durationMinutes} 分鐘的專注飛行。</p>
              <p className="text-sm text-emerald-200/70 font-medium tracking-wide">
                {airports.find(a => a.code === departure)?.name} ✈️ {airports.find(a => a.code === destination)?.name} (座位: {selectedSeat.id})
              </p>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-400">本次獲得哩程 ({cabinOptions[selectedSeat.class].label})</div>
                <div className="text-xl font-bold text-amber-400">
                  +{Math.round(durationMinutes * cabinOptions[selectedSeat.class].multiplier)} 哩
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">累積成功班次</div>
                <div className="text-xl font-bold text-sky-400">{stats.successfulFlights} 班</div>
              </div>
            </div>

            <button
              onClick={resetApp}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
            >
              開啟下一趟航班
            </button>
          </div>
        )}

        {/* --- 狀態：失敗 --- */}
        {appState === 'failed' && (
          <div className="space-y-6 text-center animate-in zoom-in duration-300 py-6">
            <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
              <XCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-rose-400">航班發生意外！</h2>
              <p className="text-slate-300">
                {strictMode ? '您離開了駕駛艙（切換視窗），導致飛行中斷。' : '您提前終止了這次的專注飛行。'}
              </p>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">飛行時間</div>
              <div className="text-xl font-bold text-slate-200">
                {Math.floor((durationMinutes * 60 - timeRemaining) / 60)} 分 {(durationMinutes * 60 - timeRemaining) % 60} 秒
              </div>
              <div className="text-xs text-rose-400 mt-2">（未完成的航程無法累積哩程）</div>
            </div>

            <button
              onClick={resetApp}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
            >
              返回停機坪
            </button>
          </div>
        )}

      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-4 text-xs text-slate-500 font-medium z-0">
        專注飛行模擬器 - Focus Flight Simulator
      </div>
    </div>
  );
}
