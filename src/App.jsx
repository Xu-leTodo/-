import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plane, Clock, Play, Square, Settings, Award, XCircle, AlertTriangle, Cloud, ShieldAlert, MapPin, ArrowRightLeft, X, Check, Bell, Info, Sun, Gauge, Wind, Compass, Volume2, VolumeX, Ticket, Luggage, QrCode, ScanLine, UserCheck, Loader2, User, Users, Moon, ShoppingBag, Palette, Music, Globe, Lock, Unlock, Armchair } from 'lucide-react';

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

// 商店商品資料庫 (新增艙等通行證)
const SHOP_ITEMS = [
  { id: 'cabin_business', type: 'cabin', name: '商務艙通行證', price: 600, desc: '解鎖商務艙劃位權限，享有專屬深邃靛藍座艙介面', icon: '🥂' },
  { id: 'cabin_first', type: 'cabin', name: '頭等艙通行證', price: 1500, desc: '解鎖頭等艙劃位權限，享有專屬尊榮琥珀座艙介面', icon: '👑' },
  { id: 'plane_gold', type: 'plane', name: '黃金客機塗裝', price: 800, desc: '尊貴的象徵，機身閃耀金色光芒', icon: '✨', colorClass: 'text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]' },
  { id: 'plane_neon', type: 'plane', name: '賽博霓虹戰機', price: 1200, desc: '未來感十足，散發粉紫霓虹引擎光', icon: '⚡', colorClass: 'text-fuchsia-400 drop-shadow-[0_0_15px_rgba(232,121,249,0.8)]' },
  { id: 'plane_stealth', type: 'plane', name: '極黑隱形機', price: 2000, desc: '吸收一切光線，進入絕對專注的深色領域', icon: '🦇', colorClass: 'text-slate-700 drop-shadow-[0_0_10px_rgba(0,0,0,1)]' },
  { id: 'sound_rain', type: 'sound', name: '高空平流雨', price: 400, desc: '引擎聲伴隨療癒的高頻雨滴聲', icon: '🌧️' },
  { id: 'sound_deep', type: 'sound', name: '深海潛航', price: 800, desc: '隔絕外界，極低頻的沉浸式隔音體驗', icon: '🌊' },
  { id: 'dest_moon', type: 'dest', name: '月球靜海', price: 3000, desc: '解鎖隱藏航線：飛向月球太空港', icon: '🌕', extra: { code: 'LUN', name: '月球太空港', lat: 0, lon: 0, tz: 'UTC', isSpecial: true, dist: 384400, duration: 90 } },
  { id: 'dest_mars', type: 'dest', name: '火星基地', price: 8000, desc: '解鎖終極航線：前往火星奧林帕斯', icon: '🪐', extra: { code: 'MAR', name: '火星基地', lat: 0, lon: 0, tz: 'UTC', isSpecial: true, dist: 225000000, duration: 120 } }
];

export default function App() {
  // --- 延遲切換狀態 Hook ---
  const useDelayedState = (initialState, delayMs = 400, onStateChange = null) => {
    const [state, setState] = useState(initialState);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const setDelayedState = useCallback((newState) => {
      if (newState === state) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setState(newState);
        setIsTransitioning(false);
        if (onStateChange) onStateChange(newState);
      }, delayMs);
    }, [state, delayMs, onStateChange]);

    return [state, setDelayedState, isTransitioning];
  };

  const [appState, setAppState, isAppTransitioning] = useDelayedState('setup');
  const [showSeatMap, setShowSeatMap, isSeatMapTransitioning] = useDelayedState(false, 300);
  const [isPrintingTicket, setIsPrintingTicket] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [shopTab, setShopTab] = useState('cabin'); // 'cabin', 'plane', 'sound', 'dest'

  const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'info' });
  const toastTimerRef = useRef(null);

  const showToast = useCallback((title, message, type = 'info') => {
    setToast({ visible: true, title, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => { setToast(prev => ({ ...prev, visible: false })); }, 4500);
  }, []);

  const baseAirports = [
    { code: 'TSA', name: '台北松山', lat: 25.0697, lon: 121.5525, tz: 'Asia/Taipei' },
    { code: 'TPE', name: '桃園國際', lat: 25.0777, lon: 121.2328, tz: 'Asia/Taipei' },
    { code: 'RMQ', name: '台中清泉崗', lat: 24.2644, lon: 120.6200, tz: 'Asia/Taipei' },
    { code: 'KHH', name: '高雄小港', lat: 22.5771, lon: 120.3500, tz: 'Asia/Taipei' },
    { code: 'MZG', name: '澎湖馬公', lat: 23.5680, lon: 119.6295, tz: 'Asia/Taipei' },
    { code: 'OKA', name: '沖繩那霸', lat: 26.1958, lon: 127.6458, tz: 'Asia/Tokyo' },
    { code: 'HKG', name: '香港赤鱲角', lat: 22.3089, lon: 113.9146, tz: 'Asia/Hong_Kong' },
    { code: 'NRT', name: '東京成田', lat: 35.7647, lon: 140.3863, tz: 'Asia/Tokyo' },
    { code: 'SIN', name: '新加坡樟宜', lat: 1.3592, lon: 103.9893, tz: 'Asia/Singapore' },
    { code: 'LAX', name: '洛杉磯', lat: 33.9416, lon: -118.4085, tz: 'America/Los_Angeles' }
  ];

  // 初始不給予任何哩程
  const [stats, setStats] = useState({ successfulFlights: 0, totalFlightMinutes: 0, totalMileage: 0 });
  const [inventory, setInventory] = useState(['plane_default', 'sound_default']);
  const [equipped, setEquipped] = useState({ plane: 'plane_default', sound: 'sound_default' });

  const airports = useMemo(() => {
    let list = [...baseAirports];
    SHOP_ITEMS.filter(item => item.type === 'dest' && inventory.includes(item.id)).forEach(dest => {
      list.push(dest.extra);
    });
    return list;
  }, [inventory]);

  const getDistance = useCallback((depApt, destApt) => {
    if (!depApt || !destApt) return { dist: 0, dur: 0 };
    if (depApt.isSpecial || destApt.isSpecial) {
      const target = destApt.isSpecial ? destApt : depApt;
      if (depApt.isSpecial && destApt.isSpecial && depApt.code !== destApt.code) return { dist: 9999999, dur: 150 };
      return { dist: target.dist, dur: target.duration };
    }
    const R = 6371;
    const dLat = (destApt.lat - depApt.lat) * Math.PI / 180;
    const dLon = (destApt.lon - depApt.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(depApt.lat * Math.PI / 180) * Math.cos(destApt.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const dist = Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
    return { dist, dur: Math.round((dist / 800) * 60 + 30) };
  }, []);

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [strictMode, setStrictMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [departure, setDeparture] = useState('TSA');
  const [destination, setDestination] = useState('MZG');
  const [flightDistance, setFlightDistance] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState({ id: '6A', class: 'economy' });
  const [flightNumber, setFlightNumber] = useState('');

  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [totalPassengers, setTotalPassengers] = useState(0);
  const [boardedCount, setBoardedCount] = useState(1);
  const [cabinEvent, setCabinEvent] = useState("乘客們正在安靜地休息...");
  const [cabinEventKey, setCabinEventKey] = useState(0);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [boardingTime, setBoardingTime] = useState('');
  const [abortProgress, setAbortProgress] = useState(0);
  const abortTimerRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const wakeLockRef = useRef(null);
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const gainNodeRef = useRef(null);

  // 艙等屬性：不再有 multiplier，而是改為 desc 說明場景變化
  const cabinOptions = {
    economy: { label: '經濟艙', desc: '標準座艙介面', icon: '💺', color: 'bg-slate-700/80', hover: 'hover:bg-slate-600', active: 'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.6)]' },
    business: { label: '商務艙', desc: '深邃靛藍專屬介面', icon: '🥂', color: 'bg-indigo-900/80', hover: 'hover:bg-indigo-800', active: 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]' },
    first: { label: '頭等艙', desc: '尊榮琥珀專屬介面', icon: '👑', color: 'bg-amber-900/80', hover: 'hover:bg-amber-800', active: 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]' }
  };

  const formatTimeInTz = useCallback((date, tz) => {
    if (!date || !tz) return '--:--';
    try { return date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch (e) { return '--:--'; }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) { showToast('系統提示', '您的裝置不支援系統通知', 'error'); return; }
    if (notificationsEnabled) { setNotificationsEnabled(false); showToast('通知已關閉', '您將不會收到系統層級的推播', 'info'); }
    else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') { setNotificationsEnabled(true); showToast('推播已啟用', '您將在航班抵達收到通知', 'success'); }
    }
  };

  useEffect(() => {
    const allSeats = [];
    planeLayout.forEach(row => { if (row.row) row.layout.forEach(seat => { if (seat !== 'space' && seat !== 'aisle') allSeats.push(`${row.row}${seat}`); }); });
    const occupancyRate = 0.4 + Math.random() * 0.35;
    const occupied = allSeats.filter(s => s !== selectedSeat.id && Math.random() < occupancyRate);
    setOccupiedSeats(occupied);
    setTotalPassengers(occupied.length + 1);
  }, [departure, destination]);

  useEffect(() => {
    if (appState === 'flying') {
      const events = ["一位乘客正在閱讀實體書", "空服員正在走道發放毛毯", "前排乘客稍微調整了座椅靠背", "機艙內傳來極輕微的鍵盤敲擊聲", "有人打開了遮陽板，星光微微灑入", "空服員經過走道，提供茶水服務", "旁邊的乘客戴著耳機進入了夢鄉", "一位乘客正專注地使用平板電腦", "機艙燈光微微調暗以利休息", "有人輕聲向空服員要了一杯溫水", "客艙內瀰漫著安靜平穩的氣氛"];
      const interval = setInterval(() => {
        if (Math.random() > 0.3) { setCabinEvent(events[Math.floor(Math.random() * events.length)]); setCabinEventKey(prev => prev + 1); }
      }, 25000);
      return () => clearInterval(interval);
    }
  }, [appState]);

  // --- 商店與權限邏輯 ---
  const handlePurchase = (item) => {
    if (inventory.includes(item.id)) return;
    if (stats.totalMileage >= item.price) {
      setStats(prev => ({ ...prev, totalMileage: prev.totalMileage - item.price }));
      setInventory(prev => [...prev, item.id]);
      showToast('購買成功', `您已成功解鎖「${item.name}」！`, 'success');
      if (item.type === 'plane' || item.type === 'sound') {
        setEquipped(prev => ({ ...prev, [item.type]: item.id }));
      }
    } else {
      showToast('哩程不足', `還差 ${item.price - stats.totalMileage} 哩才能解鎖此項目。`, 'error');
    }
  };

  const handleEquip = (item) => {
    if (item.type === 'plane' || item.type === 'sound') {
      setEquipped(prev => ({ ...prev, [item.type]: item.id }));
      showToast('裝備成功', `已套用「${item.name}」`, 'success');
    }
  };

  const isCabinLocked = (rowClass) => {
    if (rowClass === 'business' && !inventory.includes('cabin_business')) return true;
    if (rowClass === 'first' && !inventory.includes('cabin_first')) return true;
    return false;
  };

  const getCurrentPlaneStyle = () => {
    const defaultStyle = 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]';
    if (equipped.plane === 'plane_default') return defaultStyle;
    const item = SHOP_ITEMS.find(i => i.id === equipped.plane);
    return item ? item.colorClass : defaultStyle;
  };

  // --- 音效與廣播控制邏輯 ---
  const playAnnouncement = useCallback((zhText, enText) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    const zhUtterance = new SpeechSynthesisUtterance(zhText); zhUtterance.lang = 'zh-TW'; zhUtterance.rate = 0.9;
    const enUtterance = new SpeechSynthesisUtterance(enText); enUtterance.lang = 'en-US'; enUtterance.rate = 0.9;
    window.speechSynthesis.speak(zhUtterance); window.speechSynthesis.speak(enUtterance);
  }, [audioEnabled]);

  const startCabinNoise = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      if (noiseSourceRef.current) return;
      const bufferSize = audioCtxRef.current.sampleRate * 2;
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noiseSource = audioCtxRef.current.createBufferSource();
      noiseSource.buffer = buffer; noiseSource.loop = true;
      const filter = audioCtxRef.current.createBiquadFilter();
      filter.type = 'lowpass';

      if (equipped.sound === 'sound_rain') filter.frequency.value = 650;
      else if (equipped.sound === 'sound_deep') filter.frequency.value = 150;
      else filter.frequency.value = 350;

      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.setValueAtTime(0.01, audioCtxRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.4, audioCtxRef.current.currentTime + 3);
      gainNodeRef.current = gainNode;

      noiseSource.connect(filter); filter.connect(gainNode); gainNode.connect(audioCtxRef.current.destination);
      noiseSource.start(); noiseSourceRef.current = noiseSource;
    } catch (err) { }
  }, [equipped.sound]);

  const stopCabinNoise = useCallback(() => {
    if (noiseSourceRef.current && audioCtxRef.current && gainNodeRef.current) {
      try {
        gainNodeRef.current.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 1.5);
        const currentNoise = noiseSourceRef.current;
        setTimeout(() => { try { currentNoise.stop(); currentNoise.disconnect(); } catch (e) { } }, 1500);
        noiseSourceRef.current = null;
      } catch (e) { noiseSourceRef.current.stop(); noiseSourceRef.current = null; }
    }
  }, []);

  useEffect(() => {
    if (['takeoff', 'flying', 'landing'].includes(appState)) {
      if (audioEnabled) startCabinNoise();
      else { stopCabinNoise(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
    } else {
      stopCabinNoise(); if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }, [appState, audioEnabled, startCabinNoise, stopCabinNoise]);

  const requestWakeLock = useCallback(async () => { if ('wakeLock' in navigator && keepAwake) { try { wakeLockRef.current = await navigator.wakeLock.request('screen'); } catch (err) { } } }, [keepAwake]);
  const releaseWakeLock = useCallback(async () => { if (wakeLockRef.current !== null) { try { await wakeLockRef.current.release(); wakeLockRef.current = null; } catch (err) { } } }, []);

  useEffect(() => {
    if (['boarding', 'takeoff', 'flying', 'landing'].includes(appState) && keepAwake) requestWakeLock();
    else releaseWakeLock();
    return () => releaseWakeLock();
  }, [appState, keepAwake, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const depApt = airports.find(a => a.code === departure);
    const destApt = airports.find(a => a.code === destination);
    if (depApt && destApt) {
      if (depApt.code === destApt.code) { setDurationMinutes(0); setFlightDistance(0); }
      else {
        const { dist, dur } = getDistance(depApt, destApt);
        setFlightDistance(dist); setDurationMinutes(dur);
      }
    }
  }, [departure, destination, airports, getDistance]);

  useEffect(() => {
    let phaseTimer; let boardingInterval;
    if (appState === 'boarding' && hasScanned) {
      setBoardedCount(1);
      const stepTime = 4000 / totalPassengers;
      let current = 1;
      boardingInterval = setInterval(() => {
        current += Math.ceil(totalPassengers / 15);
        if (current >= totalPassengers) { current = totalPassengers; clearInterval(boardingInterval); }
        setBoardedCount(current);
      }, Math.max(stepTime, 150));

      phaseTimer = setTimeout(() => {
        setAppState('takeoff');
        playAnnouncement("艙門即將關閉。航班即將起飛，請繫好安全帶，準備開始專注。", "Cabin doors are closing. We are about to take off. Please fasten your seatbelts.");
      }, 4500);
    } else if (appState === 'takeoff') {
      phaseTimer = setTimeout(() => setAppState('flying'), 3500);
    } else if (appState === 'landing') {
      phaseTimer = setTimeout(() => {
        setAppState('finished');
        playAnnouncement("各位旅客，我們已經順利抵達目的地，感謝您的搭乘。", "Ladies and gentlemen, we have arrived at our destination. Thank you for flying with us.");
        const earnedMileage = durationMinutes; // 收益僅與時間相關，無加成
        setStats(prev => ({ successfulFlights: prev.successfulFlights + 1, totalFlightMinutes: prev.totalFlightMinutes + durationMinutes, totalMileage: prev.totalMileage + earnedMileage }));
        showToast('順利抵達目的地', `成功完成 ${durationMinutes} 分鐘專注，獲得 ${earnedMileage} 哩程。`, 'success');
        if (notificationsEnabled && 'Notification' in window) new Notification('🛬 順利抵達目的地！', { body: `您成功完成了 ${durationMinutes} 分鐘的專注飛行，獲得 ${earnedMileage} 哩程。` });
      }, 4000);
    }
    return () => { clearTimeout(phaseTimer); clearInterval(boardingInterval); };
  }, [appState, durationMinutes, notificationsEnabled, showToast, playAnnouncement, totalPassengers, hasScanned]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActiveFlightPhase = ['takeoff', 'flying', 'landing'].includes(appState);
      if (document.hidden && isActiveFlightPhase && strictMode) {
        setAppState('failed');
        playAnnouncement("警告，航班發生意外，飛行中斷。", "Warning. Flight emergency. Mission aborted.");
        showToast('航班發生意外', '您離開了駕駛艙（切換視窗），導致飛行中斷。', 'error');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, strictMode, notificationsEnabled, showToast, playAnnouncement]);

  useEffect(() => {
    let interval;
    if (appState === 'flying' && timeRemaining > 0) interval = setInterval(() => setTimeRemaining(prev => prev - 1), 1000);
    else if (appState === 'flying' && timeRemaining === 0) {
      setAppState('landing');
      playAnnouncement("各位旅客，航班即將降落，請準備結束手邊的工作。", "Ladies and gentlemen, we are preparing for landing. Please wrap up your work.");
    }
    return () => clearInterval(interval);
  }, [appState, timeRemaining, playAnnouncement]);

  const generateFlightNumber = () => {
    const airlines = ['BR', 'CI', 'JX', 'IT', 'SPACE'];
    return `${airlines[Math.floor(Math.random() * airlines.length)]}${Math.floor(100 + Math.random() * 899)}`;
  };

  const getEtaTime = () => {
    const etaDate = new Date(currentTime.getTime() + timeRemaining * 1000);
    const destApt = airports.find(a => a.code === destination);
    return formatTimeInTz(etaDate, destApt?.tz);
  };

  const startCheckin = () => {
    const depApt = airports.find(a => a.code === departure);
    setAppState('checkin');
    setIsPrintingTicket(true);
    setFlightNumber(generateFlightNumber());
    setBoardingTime(formatTimeInTz(new Date(), depApt?.tz));
    setTimeout(() => {
      setIsPrintingTicket(false);
      playAnnouncement("您的登機證已核發，請核對上方時間並前往登機門準備登機。", "Your boarding pass has been issued. Please proceed to the departure gate.");
    }, 2000);
  };

  const proceedToBoarding = () => {
    setAppState('boarding');
    setHasScanned(false);
    setIsScanning(false);
    const depApt = airports.find(a => a.code === departure);
    playAnnouncement(`各位旅客您好，當地時間是 ${formatTimeInTz(new Date(), depApt?.tz)}，本航班現在開始登機，請準備好您的登機證。`, "Ladies and gentlemen, we are now boarding. Please have your boarding pass ready.");
    setTimeRemaining(durationMinutes * 60);
  };

  const handleScanTicket = () => {
    if (isScanning || hasScanned) return;
    setIsScanning(true);

    try {
      if (audioCtxRef.current && audioEnabled) {
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.2);
      }
    } catch (e) { }

    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
    }, 1500);
  };

  const abortFlight = useCallback(() => {
    setAppState('failed');
    playAnnouncement("警告，航班緊急迫降，飛行中斷。", "Warning. Emergency landing. Mission aborted.");
  }, [playAnnouncement]);

  const startAbort = useCallback((e) => {
    if (e.type === 'touchstart' && e.cancelable) { }
    setAbortProgress(0);
    let progress = 0;
    const intervalTime = 50;
    const duration = 2000;
    const step = (intervalTime / duration) * 100;

    if (abortTimerRef.current) clearInterval(abortTimerRef.current);
    abortTimerRef.current = setInterval(() => {
      progress += step;
      if (progress >= 100) {
        clearInterval(abortTimerRef.current);
        abortTimerRef.current = null;
        setAbortProgress(100);
        abortFlight();
      } else {
        setAbortProgress(progress);
      }
    }, intervalTime);
  }, [abortFlight]);

  const cancelAbort = useCallback(() => {
    if (abortTimerRef.current) { clearInterval(abortTimerRef.current); abortTimerRef.current = null; }
    setAbortProgress(0);
  }, []);

  useEffect(() => { return () => { if (abortTimerRef.current) clearInterval(abortTimerRef.current); }; }, []);

  const resetApp = () => { setAppState('setup'); setAbortProgress(0); };

  const formatCountdown = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const progressPercent = ['flying', 'landing'].includes(appState) ? ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100 : 0;

  const planePos = (t => {
    const p0 = { x: 30, y: 90 }, p1 = { x: 200, y: -10 }, p2 = { x: 370, y: 90 };
    const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
    const angle = Math.atan2(2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y), 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)) * (180 / Math.PI);
    return { x, y, angle };
  })(progressPercent / 100);

  const currentAltitude = Math.round(Math.sin((progressPercent / 100) * Math.PI) * 35000);
  const currentSpeed = Math.round(progressPercent === 0 ? 0 : progressPercent < 10 ? (progressPercent / 10) * 850 : progressPercent > 90 ? ((100 - progressPercent) / 10) * 850 : 850 + Math.random() * 6 - 3);
  const flownDistance = Math.round(flightDistance * (progressPercent / 100));

  const getSkyBackground = () => {
    const depApt = airports.find(a => a.code === departure);
    const destApt = airports.find(a => a.code === destination);
    if (!depApt || !destApt) return 'from-blue-600 to-sky-400';

    if (destApt.isSpecial || depApt.isSpecial) return 'from-slate-950 via-indigo-950 to-black';

    const currentLon = depApt.lon + (destApt.lon - depApt.lon) * (progressPercent / 100);
    const utcHour = currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;

    let solarHour = (utcHour + currentLon / 15) % 24;
    if (solarHour < 0) solarHour += 24;

    if (solarHour >= 19 || solarHour < 5) return 'from-slate-900 via-indigo-950 to-slate-900';
    if (solarHour >= 17 && solarHour < 19) return 'from-indigo-600 via-purple-500 to-orange-400';
    if (solarHour >= 5 && solarHour < 7) return 'from-indigo-400 via-sky-400 to-orange-200';
    return 'from-blue-600 to-sky-400';
  };

  // 根據選擇的艙等更換儀表板場景樣式
  const getDashboardTheme = () => {
    if (selectedSeat.class === 'first') return { bg: 'bg-amber-950/70 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]', path: '#fbbf24', pathGrad: ['#fbbf24', '#f59e0b'] };
    if (selectedSeat.class === 'business') return { bg: 'bg-indigo-950/70 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]', path: '#818cf8', pathGrad: ['#818cf8', '#c084fc'] };
    return { bg: 'bg-slate-900/70 border-slate-700/50 shadow-inner', path: '#38bdf8', pathGrad: ['#38bdf8', '#818cf8'] };
  };
  const dashTheme = getDashboardTheme();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 font-sans selection:bg-sky-500 selection:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes drift { 0% { transform: translateX(100vw); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateX(-20vw); opacity: 0; } }
        .animate-drift-slow { animation: drift 25s linear infinite; }
        .animate-drift-medium { animation: drift 18s linear infinite; }
        .animate-drift-fast { animation: drift 12s linear infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(45deg); } 50% { transform: translateY(-10px) rotate(45deg); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes runway-move { 0% { transform: translateX(0px); } 100% { transform: translateX(-80px); } }
        .animate-runway { animation: runway-move 0.25s linear infinite; }
        @keyframes takeoff-plane { 0% { transform: translate(-80px, 40px) rotate(45deg); } 30% { transform: translate(-20px, 40px) rotate(45deg); } 60% { transform: translate(20px, 20px) rotate(25deg); } 100% { transform: translate(120px, -80px) rotate(15deg); opacity: 0; } }
        .animate-takeoff-plane { animation: takeoff-plane 3.5s ease-in forwards; }
        @keyframes landing-plane { 0% { transform: translate(-120px, -80px) rotate(75deg); opacity: 0; } 40% { transform: translate(-20px, 20px) rotate(60deg); opacity: 1; } 70% { transform: translate(20px, 40px) rotate(45deg); } 100% { transform: translate(80px, 40px) rotate(45deg); } }
        .animate-landing-plane { animation: landing-plane 4s ease-out forwards; }
        @keyframes print-ticket { 0% { transform: translateY(-50%); opacity: 0; clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%); } 100% { transform: translateY(0); opacity: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); } }
        .animate-print { animation: print-ticket 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes scan { 0%, 100% { top: 0%; opacity: 0; } 10%, 90% { opacity: 1; } 50% { top: 100%; } }
        .animate-scan { animation: scan 1.5s ease-in-out infinite; }
      `}} />

      {/* 通知 (Toast) */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${toast.visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95 pointer-events-none'}`}>
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
          <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="shrink-0 p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-full transition-colors"><X size={14} /></button>
        </div>
      </div>

      {/* 動態天色背景 */}
      {['boarding', 'takeoff', 'flying', 'landing'].includes(appState) && (
        <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-b ${getSkyBackground()} transition-all duration-[3000ms]`}>
          <div className="absolute top-1/4 left-0 text-white/30 animate-drift-slow" style={{ animationDelay: '0s' }}><Cloud size={120} /></div>
          <div className="absolute top-1/3 left-0 text-white/20 animate-drift-medium" style={{ animationDelay: '-5s' }}><Cloud size={80} /></div>
          <div className="absolute top-2/3 left-0 text-white/40 animate-drift-fast" style={{ animationDelay: '-2s' }}><Cloud size={160} /></div>
        </div>
      )}

      {/* 座位選擇 Modal */}
      {(showSeatMap || isSeatMapTransitioning) && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 duration-300 ${!showSeatMap || isSeatMapTransitioning ? 'animate-out fade-out' : 'animate-in fade-in'}`}>
          <div className={`bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col h-[85vh] overflow-hidden relative duration-300 ${!showSeatMap || isSeatMapTransitioning ? 'animate-out slide-out-to-bottom-8 zoom-out-95' : 'animate-in slide-in-from-bottom-8 zoom-in-95'}`}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 z-10">
              <h2 className="text-lg font-bold flex items-center gap-2"><Plane size={20} className="text-sky-400" /> 選擇座位</h2>
              <button onClick={() => setShowSeatMap(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-950 relative scroll-smooth shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-8 text-xs font-bold tracking-wide text-slate-300 bg-slate-900/90 backdrop-blur-md py-2 px-6 rounded-full border border-slate-700 sticky top-0 z-20 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-amber-600"></div> 頭等艙</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-indigo-600"></div> 商務艙</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-500"></div> 經濟艙</div>
                <div className="flex items-center gap-1"><User size={12} className="text-slate-500" /> 已劃位</div>
              </div>
              <div className="w-48 h-24 border-t-4 border-l-4 border-r-4 border-slate-700 rounded-t-[100px] mb-[-4px] relative bg-slate-800/20"><div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-4 bg-slate-700 rounded-full opacity-50"></div></div>
              <div className="w-full max-w-[280px] border-l-4 border-r-4 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-800 px-2 py-6 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                {planeLayout.map((row, index) => {
                  if (row.type === 'divider') return <div key={`div-${index}`} className="w-full h-px bg-slate-700/50 my-4"></div>;
                  const cabinStyle = cabinOptions[row.class];
                  const isLocked = isCabinLocked(row.class);

                  return (
                    <div key={row.row} className="flex justify-center items-center mb-2">
                      <span className="w-6 text-[10px] text-slate-500 font-mono text-right mr-2">{row.row}</span>
                      <div className="flex justify-center flex-1">
                        {row.layout.map((seat, i) => {
                          if (seat === 'space') return <div key={i} className="w-10"></div>;
                          if (seat === 'aisle') return <div key={i} className="w-6"></div>;
                          const seatId = `${row.row}${seat}`;
                          const isSelected = selectedSeat.id === seatId;
                          const isOccupied = occupiedSeats.includes(seatId);
                          const seatWidth = row.class === 'first' ? 'w-10' : row.class === 'business' ? 'w-8' : 'w-7';
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isOccupied) return;
                                if (isLocked) {
                                  showToast('權限不足', `請先至商店解鎖${cabinStyle.label}通行證`, 'error');
                                  return;
                                }
                                setSelectedSeat({ id: seatId, class: row.class });
                              }}
                              title={isOccupied ? '此座位已被選走' : isLocked ? `需解鎖${cabinStyle.label}` : `${seatId} (${cabinStyle.label})`}
                              className={`
                                ${seatWidth} h-8 mx-0.5 rounded-t-lg rounded-b-sm border-b-2 shadow-inner flex items-center justify-center text-[10px] font-bold transition-all duration-300 relative
                                ${isOccupied ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : isLocked ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-pointer' : isSelected ? `${cabinStyle.active} border-white text-white scale-110 z-10` : `${cabinStyle.color} border-slate-900/50 text-white/80 ${cabinStyle.hover} hover:scale-105`}
                              `}
                            >
                              {isLocked ? <Lock size={10} className="opacity-50" /> : isSelected ? <Check size={12} strokeWidth={4} /> : isOccupied ? <User size={12} className="opacity-40" /> : seat}
                            </button>
                          );
                        })}
                      </div>
                      <span className="w-6 ml-2"></span>
                    </div>
                  );
                })}
              </div>
              <div className="w-full max-w-[280px] h-16 border-b-4 border-l-4 border-r-4 border-slate-700 rounded-b-[60px] mt-[-4px] bg-slate-800/20"></div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900"><button onClick={() => setShowSeatMap(false)} className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">確認座位 {selectedSeat.id}</button></div>
          </div>
        </div>
      )}

      {/* 主視窗容器 */}
      <div className={`relative z-10 w-full max-w-md bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.6)] border ${['boarding', 'takeoff', 'flying', 'landing'].includes(appState) ? 'border-sky-400/30 shadow-[0_0_40px_rgba(14,165,233,0.15)] bg-slate-900/40' : 'border-white/10'} p-8 transition-all duration-700`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Plane className={`${getCurrentPlaneStyle()} ${['takeoff', 'flying', 'landing'].includes(appState) ? 'animate-pulse' : ''} transform rotate-45 transition-colors duration-500`} size={32} />
            <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-tr from-sky-200 via-sky-400 to-blue-600 drop-shadow-sm">專注飛行</h1>
          </div>
          {appState === 'setup' || appState === 'shop' ? (
            <button
              onClick={() => setAppState(appState === 'shop' ? 'setup' : 'shop')}
              className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full border transition-all ${appState === 'shop' ? 'bg-sky-500/20 text-sky-400 border-sky-500/50' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 hover:scale-105'}`}
            >
              {appState === 'shop' ? '返回設定' : <><ShoppingBag size={14} /> 免稅商店</>}
            </button>
          ) : (
            <div className="text-sm font-mono text-slate-300 font-bold bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-2">
              <Clock size={14} className="text-sky-400" />
              <span>{departure} {formatTimeInTz(currentTime, airports.find(a => a.code === departure)?.tz)}</span>
            </div>
          )}
        </div>

        {/* 以下為主視窗內容區塊，套用統一的轉場動畫容器 */}
        <div className={`transition-all duration-400 ${isAppTransitioning ? 'opacity-0 scale-95 blur-[2px] pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>

          {/* --- 狀態：免稅商店 (Shop) --- */}
          {appState === 'shop' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-amber-500/10 rotate-12"><Award size={100} /></div>
                <div className="relative z-10">
                  <div className="text-xs text-amber-400/80 font-bold uppercase tracking-widest mb-1">您的哩程餘額</div>
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 flex items-center gap-2">
                    <Award size={28} className="text-amber-400" /> {stats.totalMileage.toLocaleString()} <span className="text-sm text-amber-500/60 font-medium">哩</span>
                  </div>
                </div>
              </div>

              {/* 商店分類 Tab */}
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
                <button onClick={() => setShopTab('cabin')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${shopTab === 'cabin' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Armchair size={14} />艙等</button>
                <button onClick={() => setShopTab('plane')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${shopTab === 'plane' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Palette size={14} />塗裝</button>
                <button onClick={() => setShopTab('sound')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${shopTab === 'sound' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Music size={14} />音效</button>
                <button onClick={() => setShopTab('dest')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors ${shopTab === 'dest' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}><Globe size={14} />航線</button>
              </div>

              {/* 商品列表 */}
              <div className="space-y-3 h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {SHOP_ITEMS.filter(item => item.type === shopTab).map(item => {
                  const isOwned = inventory.includes(item.id);
                  const isEquipped = equipped[item.type] === item.id;

                  return (
                    <div key={item.id} className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1 ${isEquipped ? 'bg-sky-900/30 border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] ring-1 ring-sky-500/30' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}>
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700 shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h3 className={`font-bold ${isOwned ? 'text-white' : 'text-slate-300'}`}>{item.name}</h3>
                            {!isOwned && (
                              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <Lock size={10} /> {item.price}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>

                          <div className="mt-3">
                            {!isOwned ? (
                              <button
                                onClick={() => handlePurchase(item)}
                                disabled={stats.totalMileage < item.price}
                                className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${stats.totalMileage >= item.price ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                              >
                                解鎖
                              </button>
                            ) : (
                              ['dest', 'cabin'].includes(item.type) ? (
                                <div className="w-full py-2 rounded-lg text-sm font-bold bg-slate-800/50 text-emerald-400 flex justify-center items-center gap-2 border border-slate-700/50">
                                  <Unlock size={14} /> 已解鎖權限
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEquip(item)}
                                  disabled={isEquipped}
                                  className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${isEquipped ? 'bg-sky-500 text-white cursor-default' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                >
                                  {isEquipped ? '裝備中' : '套用裝備'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 恢復預設值選項 */}
                {(shopTab === 'plane' || shopTab === 'sound') && (
                  <div className={`p-4 rounded-xl border transition-all ${equipped[shopTab] === `${shopTab}_default` ? 'bg-sky-900/20 border-sky-500/50' : 'bg-slate-900/50 border-slate-700/50'}`}>
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-xl border border-slate-700 text-slate-400 shrink-0">
                        {shopTab === 'plane' ? '✈️' : '🎧'}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <h3 className="font-bold text-slate-300">預設{shopTab === 'plane' ? '塗裝' : '音效'}</h3>
                        <button
                          onClick={() => handleEquip({ id: `${shopTab}_default`, type: shopTab, name: '預設' })}
                          disabled={equipped[shopTab] === `${shopTab}_default`}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${equipped[shopTab] === `${shopTab}_default` ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                        >
                          {equipped[shopTab] === `${shopTab}_default` ? '裝備中' : '套用'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- 狀態：設定 --- */}
          {appState === 'setup' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 slide-in-from-bottom-4">

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2"><MapPin size={16} /> 航線設定</label>
                <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-700">
                  <select value={departure} onChange={(e) => setDeparture(e.target.value)} className="w-full bg-slate-800 text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-lg py-2 appearance-none font-bold">
                    {airports.map(apt => <option key={`dep-${apt.code}`} value={apt.code}>{apt.name}</option>)}
                  </select>
                  <button onClick={() => { const temp = departure; setDeparture(destination); setDestination(temp); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shrink-0" title="反轉航線"><ArrowRightLeft size={16} /></button>
                  <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full bg-slate-800 text-center text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-lg py-2 appearance-none font-bold">
                    {airports.map(apt => <option key={`dest-${apt.code}`} value={apt.code}>{apt.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-b from-sky-900/30 to-blue-900/10 border border-sky-500/20 p-6 rounded-2xl text-center space-y-2 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                <div className="absolute -left-6 -bottom-6 text-sky-500/10 -rotate-12"><Plane size={120} /></div>
                <div className="text-xs text-sky-300/80 font-bold uppercase tracking-widest relative z-10">預計飛行時間 (專注時長)</div>
                {durationMinutes > 0 ? (
                  <div className="relative z-10">
                    <div className="text-4xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-sky-200 drop-shadow-sm py-1">
                      {Math.floor(durationMinutes / 60) > 0 && `${Math.floor(durationMinutes / 60)}h `}{durationMinutes % 60}m
                    </div>
                    <div className="text-xs text-sky-300/70 flex items-center justify-center gap-3 mt-2 font-medium tracking-wide">
                      <span className="bg-sky-500/10 px-2 py-1 rounded-md">{flightDistance.toLocaleString()} km</span>
                      <span className="bg-sky-500/10 px-2 py-1 rounded-md">約 {totalPassengers} 乘客</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xl font-bold text-rose-400 py-4 relative z-10">請選擇不同的目的地</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2"><span className="text-base">{cabinOptions[selectedSeat.class].icon}</span> 選擇座艙與專屬場景</label>
                <button onClick={() => setShowSeatMap(true)} className="w-full flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/80 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-slate-900 ${cabinOptions[selectedSeat.class].active}`}>{selectedSeat.id}</div>
                    <div className="text-left"><div className="font-bold text-slate-200">{cabinOptions[selectedSeat.class].label}</div><div className="text-xs text-slate-400">{cabinOptions[selectedSeat.class].desc}</div></div>
                  </div>
                  <div className="text-sky-400 text-sm font-medium group-hover:underline">劃位</div>
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2"><Settings size={16} /> 飛行系統設定</label>
                <div className="bg-slate-900/50 rounded-xl border border-slate-700 divide-y divide-slate-700/50 shadow-inner">
                  <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className={strictMode ? 'text-rose-400' : 'text-slate-500'} size={20} />
                      <div><div className="text-sm font-medium text-slate-200">嚴格模式</div><div className="text-[11px] text-slate-400 mt-0.5">離開畫面即判定空難 (起飛後生效)</div></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={strictMode} onChange={() => setStrictMode(!strictMode)} />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>
                  </div>
                  <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <Sun className={keepAwake ? 'text-amber-400' : 'text-slate-500'} size={20} />
                      <div><div className="text-sm font-medium text-slate-200">保持螢幕常亮</div><div className="text-[11px] text-slate-400 mt-0.5">飛行期間防止裝置進入休眠</div></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={keepAwake} onChange={() => { const newState = !keepAwake; setKeepAwake(newState); showToast(newState ? '已開啟常亮' : '已關閉常亮', newState ? '飛行期間將保持螢幕亮起' : '螢幕將自動休眠', 'info'); }} />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <div className="p-4 flex items-center justify-between transition-colors hover:bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      {audioEnabled ? <Volume2 className="text-sky-400" size={20} /> : <VolumeX className="text-slate-500" size={20} />}
                      <div><div className="text-sm font-medium text-slate-200">機艙廣播與環境音</div><div className="text-[11px] text-slate-400 mt-0.5">播放專屬音效與白噪音</div></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={audioEnabled} onChange={() => setAudioEnabled(!audioEnabled)} />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <button onClick={startCheckin} disabled={durationMinutes === 0} className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 ${durationMinutes > 0 ? 'bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.3)] shadow-inner border-t border-white/20 hover:-translate-y-1 active:scale-[0.98]' : 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/50'}`}>
                <Luggage size={20} /> {durationMinutes > 0 ? '辦理登機手續' : '航班停飛 (重新選擇)'}
              </button>
            </div>
          )}

          {/* --- 狀態：辦理登機 --- */}
          {appState === 'checkin' && (
            <div className="space-y-6 py-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              {isPrintingTicket ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <Loader2 className="animate-spin text-sky-400" size={48} />
                  <div className="text-lg font-bold text-sky-300 animate-pulse">正在為您印製專屬登機證...</div>
                  <div className="text-sm text-slate-400">系統正在同步時區與航班資料</div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center space-y-6">
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-widest">辦理完成</h2>
                    <p className="text-sm text-sky-300">請領取您的登機證並前往登機門</p>
                  </div>
                  <div className="w-full max-w-sm bg-[#f8fafc] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-print relative border border-white/20">
                    <div className={`p-6 text-white flex justify-between items-center relative overflow-hidden shadow-inner ${selectedSeat.class === 'first' ? 'bg-gradient-to-br from-amber-500 to-amber-700' : selectedSeat.class === 'business' ? 'bg-gradient-to-br from-indigo-500 to-indigo-800' : 'bg-gradient-to-br from-sky-400 to-blue-600'}`}>
                      <div className="absolute -right-8 -top-8 opacity-10 rotate-12"><Plane size={120} /></div>
                      <div className="relative z-10"><div className="text-[10px] font-bold tracking-widest opacity-80 uppercase drop-shadow-sm">Boarding Pass</div><div className="text-2xl font-black font-mono tracking-wide drop-shadow-md mt-1">{flightNumber}</div></div>
                      <div className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-sm border border-white/30 relative z-10">{cabinOptions[selectedSeat.class].label}</div>
                    </div>
                    <div className="p-8 bg-white relative">
                      <div className="flex justify-between items-center mb-8">
                        <div className="text-center"><div className="text-4xl font-black text-slate-800 font-mono tracking-tight">{departure}</div><div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{airports.find(a => a.code === departure)?.name}</div></div>
                        <div className="flex flex-col items-center px-4 w-full">
                          <Plane size={24} className={`mb-2 ${selectedSeat.class === 'first' ? 'text-amber-500' : selectedSeat.class === 'business' ? 'text-indigo-500' : 'text-sky-500'}`} />
                          <div className="w-full h-[2px] bg-slate-200 relative"><div className="absolute left-1/2 -translate-x-1/2 -top-3.5 bg-white px-2 text-[10px] text-slate-400 font-bold tracking-widest">{Math.floor(durationMinutes / 60) > 0 ? `${Math.floor(durationMinutes / 60)}h ` : ''}{durationMinutes % 60}m</div></div>
                        </div>
                        <div className="text-center"><div className="text-4xl font-black text-slate-800 font-mono tracking-tight">{destination}</div><div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{airports.find(a => a.code === destination)?.name}</div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-2">
                        <div><div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Passenger</div><div className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase"><UserCheck size={16} className="text-slate-400" /> Traveler</div></div>
                        <div><div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Seat</div><div className={`text-xl font-black ${selectedSeat.class === 'first' ? 'text-amber-600' : selectedSeat.class === 'business' ? 'text-indigo-600' : 'text-sky-600'}`}>{selectedSeat.id}</div></div>
                        <div><div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Gate</div><div className="text-xl font-black text-slate-800">G{Math.floor(Math.random() * 8) + 1}</div></div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Boarding Time</div>
                          <div className="text-xl font-mono font-black text-rose-500 animate-pulse">{boardingTime}</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute left-0 right-0 top-0 flex justify-between items-center px-[-8px]">
                        <div className="w-6 h-6 rounded-full bg-slate-900/60 absolute -left-3 -top-3 shadow-inner"></div>
                        <div className="w-full border-t-[3px] border-dashed border-slate-200 mx-4"></div>
                        <div className="w-6 h-6 rounded-full bg-slate-900/60 absolute -right-3 -top-3 shadow-inner"></div>
                      </div>
                      <div className="bg-slate-50 px-8 py-6 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="flex items-center gap-6 opacity-90">
                          <QrCode size={64} className="text-slate-800 drop-shadow-sm" />
                          <div className="flex gap-[3px] h-16 items-center">
                            {[...Array(24)].map((_, i) => (
                              <div key={i} className="bg-slate-800 rounded-sm" style={{ width: [2, 3, 4, 1.5][Math.floor(Math.random() * 4)] + 'px', height: Math.random() > 0.8 ? '80%' : '100%' }}></div>
                            ))}
                          </div>
                        </div>
                        <div className="w-full flex justify-between items-center mt-5">
                          <div className="text-[10px] text-slate-400 tracking-[0.2em] font-mono font-bold uppercase">TKT-{Math.floor(1000 + Math.random() * 8999)}</div>
                          <div className="text-[10px] text-slate-400 tracking-[0.2em] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded-sm text-slate-600">SEQ {Math.floor(10 + Math.random() * 89)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button onClick={proceedToBoarding} className="w-full bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 border-t border-white/20 text-white font-bold py-4 rounded-2xl shadow-[0_8px_20px_rgba(14,165,233,0.3)] shadow-inner flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-[0.98]">
                    <Ticket size={20} /> 前往登機門
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- 狀態：登機門掃描 --- */}
          {appState === 'boarding' && (
            <div className="space-y-8 py-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 relative min-h-[350px] rounded-3xl overflow-hidden bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-inner">
              <div className="text-center space-y-2 relative z-10 w-full mb-2">
                <div className="text-2xl font-bold text-white tracking-widest animate-pulse">登機口驗票</div>
                <div className="text-sm text-sky-200/80">出發地時間 {formatTimeInTz(currentTime, airports.find(a => a.code === departure)?.tz)}</div>
              </div>

              {!hasScanned ? (
                <button
                  onClick={handleScanTicket}
                  disabled={isScanning}
                  className="relative flex flex-col items-center z-10 w-full group transition-all"
                >
                  <div className={`relative w-48 h-48 bg-slate-900/80 rounded-3xl border-2 shadow-inner ${isScanning ? 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.3)]' : 'border-slate-600/60 group-hover:border-sky-500 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.2)]'} flex flex-col items-center justify-center overflow-hidden transition-all duration-500`}>

                    {/* 模擬登機證靠近的動畫 */}
                    <div className={`absolute transition-all duration-700 ${isScanning ? 'top-[10%] scale-110 opacity-100' : '-top-12 scale-90 opacity-0 group-hover:top-[5%] group-hover:opacity-80 group-hover:scale-95'}`}>
                      <div className="w-28 h-40 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-slate-200 p-3 flex flex-col items-center justify-start transform rotate-[-5deg]">
                        <div className="w-full flex justify-between items-center mb-2"><Plane size={14} className="text-sky-500" /><span className="text-[8px] font-bold text-slate-400 tracking-widest">PASS</span></div>
                        <QrCode size={48} className="text-slate-800" />
                        <div className="mt-4 w-full flex justify-center gap-[2px]">
                          {[...Array(15)].map((_, i) => <div key={i} className="h-6 bg-slate-800 rounded-sm" style={{ width: Math.random() > 0.5 ? '2px' : '3px' }}></div>)}
                        </div>
                        <div className="w-16 h-1 bg-slate-200 rounded-full mt-4"></div>
                        <div className="w-10 h-1 bg-slate-200 rounded-full mt-1.5"></div>
                      </div>
                    </div>

                    {/* 掃描線動畫 */}
                    {isScanning && (
                      <div className="absolute left-0 right-0 h-1.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] animate-scan z-20"></div>
                    )}

                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                        <ScanLine size={48} className="text-sky-400 animate-pulse drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                        <span className="text-sm font-bold tracking-widest text-sky-300 drop-shadow-md">點擊感應登機證</span>
                      </div>
                    )}
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-6 z-10 w-full animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
                    <Check size={40} />
                  </div>
                  <div className="text-xl font-bold text-emerald-400 tracking-widest animate-[pulse_2s_ease-in-out_infinite]">登機成功</div>

                  <div className="w-full max-w-[260px] text-center space-y-3 mt-2 bg-slate-800/60 p-5 rounded-2xl border border-slate-700 shadow-inner">
                    <div className="text-xs text-slate-400 flex items-center justify-between font-bold">
                      <span className="uppercase tracking-wider">登機進度</span>
                      <span className="font-mono text-white">{boardedCount} <span className="text-slate-500">/ {totalPassengers}</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-800">
                      <div className="h-full bg-gradient-to-r from-sky-500 via-blue-400 to-sky-300 transition-all duration-300 ease-out relative" style={{ width: `${(boardedCount / totalPassengers) * 100}%` }}>
                        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-runway"></div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 text-left font-medium tracking-wide">
                      {boardedCount < totalPassengers ? '其他旅客正在就座，請稍候...' : '所有旅客已登機，即將關閉艙門'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- 狀態：起飛 --- */}
          {appState === 'takeoff' && (
            <div className="space-y-8 py-10 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700 relative min-h-[250px] rounded-2xl overflow-hidden bg-slate-900/50 backdrop-blur-sm">
              <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"><div className="absolute bottom-12 w-[200%] h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.6)_20px,rgba(255,255,255,0.6)_60px)] animate-runway"></div></div>
              <div className="relative z-10 animate-takeoff-plane"><Plane className={getCurrentPlaneStyle()} size={72} /></div>
              <div className="text-center space-y-2 relative z-10 mt-12 w-full">
                <div className="text-2xl font-bold text-white tracking-widest animate-pulse">🛫 準備起飛</div>
                <div className="text-sm text-white/90 bg-slate-800/80 rounded-full py-1 px-4 inline-block backdrop-blur-sm border border-slate-600">請繫好安全帶，即將進入專注模式</div>
              </div>
            </div>
          )}

          {/* --- 狀態：降落 --- */}
          {appState === 'landing' && (
            <div className="space-y-8 py-10 flex flex-col items-center justify-center animate-in fade-in duration-700 relative min-h-[250px] rounded-2xl overflow-hidden bg-slate-900/50 backdrop-blur-sm">
              <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"><div className="absolute bottom-12 w-[200%] h-2 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,rgba(255,255,255,0.6)_20px,rgba(255,255,255,0.6)_60px)] animate-runway"></div></div>
              <div className="relative z-10 animate-landing-plane"><Plane className={getCurrentPlaneStyle()} size={72} /></div>
              <div className="text-center space-y-2 relative z-10 mt-12 w-full">
                <div className="text-2xl font-bold text-white tracking-widest animate-pulse">🛬 即將降落</div>
                <div className="text-sm text-white/90 bg-slate-800/80 rounded-full py-1 px-4 inline-block backdrop-blur-sm border border-slate-600">航程即將結束，請準備回到現實</div>
              </div>
            </div>
          )}

          {/* --- 狀態：飛行中 --- */}
          {appState === 'flying' && (
            <div className="space-y-6 py-4 flex flex-col items-center animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full border border-white/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                <div className="absolute inset-4 rounded-full border border-white/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: '0.5s' }}></div>
                <Plane className={`${getCurrentPlaneStyle()} animate-float`} size={64} />
              </div>

              <div className="text-center space-y-2 w-full">
                <div className="text-xs tracking-[0.2em] text-sky-200/80 uppercase font-bold flex items-center justify-center gap-3 drop-shadow-sm mb-2">
                  <span>FLIGHT {flightNumber}</span> <span className="w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]"></span> <span>IN PROGRESS</span>
                </div>
                <div className="text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-sky-100 drop-shadow-[0_4px_24px_rgba(255,255,255,0.3)] tracking-tighter mix-blend-screen">{formatCountdown(timeRemaining)}</div>
                <div className="text-sm font-medium text-white/90 flex items-center justify-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-white/10 rounded-lg text-xs border border-white/20 text-white shadow-inner flex items-center gap-1.5 backdrop-blur-md"><span className="opacity-80 drop-shadow-md">{cabinOptions[selectedSeat.class].icon}</span> <span className="font-bold tracking-wide">{selectedSeat.id}</span></span>
                  <span className="flex items-center gap-2 font-bold tracking-wide">{airports.find(a => a.code === departure)?.name} <Plane size={14} className="text-sky-300 opacity-80" /> {airports.find(a => a.code === destination)?.name}</span>
                </div>
              </div>

              {/* 客製化儀表板場景 */}
              <div className={`w-full mt-2 rounded-2xl p-4 backdrop-blur-xl relative z-10 transition-colors duration-1000 ${dashTheme.bg}`}>

                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/50 uppercase">出發地時間</span>
                    <span className="text-sm font-bold">
                      {formatTimeInTz(currentTime, airports.find(a => a.code === departure)?.tz)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80" style={{ color: dashTheme.pathGrad[1] }}>預計抵達 (ETA)</span>
                    <span className="text-lg font-mono font-bold text-white drop-shadow-sm" title="目的地當地時間">{getEtaTime()}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-white/50 uppercase">目的地時間</span>
                    <span className="text-sm font-bold">
                      {formatTimeInTz(currentTime, airports.find(a => a.code === destination)?.tz)}
                    </span>
                  </div>
                </div>

                <div className="relative w-full h-[80px] mb-4">
                  <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible drop-shadow-md">
                    <path d="M 30 90 Q 200 -10 370 90" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeDasharray="6 6" />
                    <defs><linearGradient id="flightPathGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={dashTheme.pathGrad[0]} /><stop offset="100%" stopColor={dashTheme.pathGrad[1]} /></linearGradient></defs>
                    <clipPath id="progressClip"><rect x="0" y="-30" width={(progressPercent / 100) * 400} height="160" /></clipPath>
                    <path d="M 30 90 Q 200 -10 370 90" fill="none" stroke="url(#flightPathGrad)" strokeWidth="4" clipPath="url(#progressClip)" />
                    <circle cx="30" cy="90" r="4" fill={dashTheme.path} className="animate-[ping_2s_infinite]" />
                    <circle cx="370" cy="90" r="4" fill="rgba(255,255,255,0.4)" />
                    <text x="30" y="112" fontSize="11" fill="rgba(255,255,255,0.5)" textAnchor="middle">{departure}</text>
                    <text x="370" y="112" fontSize="11" fill="rgba(255,255,255,0.5)" textAnchor="middle">{destination}</text>
                    <g transform={`translate(${planePos.x}, ${planePos.y}) rotate(${planePos.angle})`}>
                      <circle cx="0" cy="0" r="16" fill="rgba(255, 255, 255, 0.15)" className="animate-[ping_1.5s_infinite]" />
                      <g transform="translate(-10, -10) rotate(45, 10, 10)"><Plane size={20} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" /></g>
                    </g>
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 shadow-[inner_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:bg-black/40">
                    <div className="flex items-center justify-center gap-1 text-white/50 mb-1"><Compass size={12} /><span className="text-[10px] uppercase">已飛距離</span></div>
                    <div className="font-mono text-sm font-bold text-white">{flownDistance.toLocaleString()} <span className="text-[10px] text-white/40">km</span></div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 shadow-[inner_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:bg-black/40">
                    <div className="flex items-center justify-center gap-1 text-white/50 mb-1"><Gauge size={12} /><span className="text-[10px] uppercase">對地速度</span></div>
                    <div className="font-mono text-sm font-bold text-white">{currentSpeed.toLocaleString()} <span className="text-[10px] text-white/40">km/h</span></div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 shadow-[inner_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:bg-black/40">
                    <div className="flex items-center justify-center gap-1 text-white/50 mb-1"><Wind size={12} /><span className="text-[10px] uppercase">飛行高度</span></div>
                    <div className="font-mono text-sm font-bold text-white">{currentAltitude.toLocaleString()} <span className="text-[10px] text-white/40">ft</span></div>
                  </div>
                </div>

                <div className="mt-4 px-3 py-2 bg-black/20 rounded-lg border border-white/5 flex items-center gap-3 overflow-hidden shadow-inner">
                  <Users size={14} className="text-white/40 shrink-0" />
                  <div key={cabinEventKey} className="text-xs text-white/80 font-medium tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-1000 truncate">
                    {cabinEvent}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full mt-2 px-1">
                <button
                  onClick={() => { setAudioEnabled(!audioEnabled); showToast(!audioEnabled ? '環境音已開啟' : '環境音已關閉', '', 'info'); }}
                  className="text-white/60 hover:text-sky-300 text-xs flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-slate-900/50 transition-colors relative z-20 backdrop-blur-sm border border-transparent hover:border-slate-700 touch-none select-none"
                >
                  {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  {audioEnabled ? '關閉環境音' : '開啟環境音'}
                </button>

                <button
                  onMouseDown={startAbort} onMouseUp={cancelAbort} onMouseLeave={cancelAbort} onTouchStart={startAbort} onTouchEnd={cancelAbort} onContextMenu={(e) => e.preventDefault()}
                  className="relative overflow-hidden text-white/60 hover:text-rose-300 text-xs flex items-center gap-2 px-4 py-3 rounded-xl transition-colors z-20 border border-transparent hover:border-slate-700 bg-slate-800/50 touch-none select-none"
                >
                  <div className="absolute left-0 top-0 bottom-0 bg-rose-600/40 transition-all ease-linear" style={{ width: `${abortProgress}%`, transitionDuration: abortProgress > 0 ? '50ms' : '200ms' }}></div>
                  <span className="relative z-10 flex items-center gap-2 font-medium">
                    <AlertTriangle size={16} className={abortProgress > 0 ? 'text-rose-400 animate-pulse' : ''} />
                    {abortProgress > 0 ? '即將迫降...' : '長按 2 秒緊急降落'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* --- 狀態：完成 --- */}
          {appState === 'finished' && (
            <div className="space-y-6 text-center animate-in zoom-in-95 slide-in-from-bottom-8 duration-700 py-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30"><Award size={40} /></div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-emerald-400">順利抵達目的地！</h2>
                <p className="text-slate-300">當地時間 {formatTimeInTz(currentTime, airports.find(a => a.code === destination)?.tz)}，您已順利結束這趟專注旅程。</p>
                <p className="text-sm text-emerald-200/70 font-medium tracking-wide">{airports.find(a => a.code === departure)?.name} ✈️ {airports.find(a => a.code === destination)?.name}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 grid grid-cols-2 gap-4">
                <div><div className="text-xs text-slate-400">本次獲得哩程</div><div className="text-xl font-bold text-amber-400">+{durationMinutes} 哩</div></div>
                <div><div className="text-xs text-slate-400">累積成功班次</div><div className="text-xl font-bold text-sky-400">{stats.successfulFlights} 班</div></div>
              </div>
              <button onClick={resetApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">前往停機坪</button>
            </div>
          )}

          {/* --- 狀態：失敗 --- */}
          {appState === 'failed' && (
            <div className="space-y-6 text-center animate-in slide-in-from-top-8 fade-in duration-500 py-6">
              <div className="w-20 h-20 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30"><XCircle size={40} /></div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-rose-400">航班發生意外！</h2>
                <p className="text-slate-300">{strictMode ? '您離開了駕駛艙（切換視窗），導致飛行中斷。' : '您提前終止了這次的專注飛行。'}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="text-xs text-slate-400 mb-1">飛行時間</div>
                <div className="text-xl font-bold text-slate-200">{Math.floor((durationMinutes * 60 - timeRemaining) / 60)} 分 {(durationMinutes * 60 - timeRemaining) % 60} 秒</div>
                <div className="text-xs text-rose-400 mt-2">（未完成的航程無法累積哩程）</div>
              </div>
              <button onClick={resetApp} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all">返回停機坪</button>
            </div>
          )}
        </div>
        <div className="absolute bottom-4 text-xs text-white/40 font-medium z-0 drop-shadow-md">專注飛行模擬器 - Focus Flight Simulator</div>
      </div>
    </div>
  );
}
