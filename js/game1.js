const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let matchedPairs = new Set();
let lastClickedWord = null;
let currentLanguage = 'english'; // 默认英语-释义配对
let timerInterval = null;
let startTime = 0;
let isTimerRunning = false;

// 使用Web Speech API播放单词发音 - 优化版本
function speakWord(word) {
    if (!word) return;
    
    console.log("🚀 播放单词：", word);
    
    // 先清空之前的语音
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance();
    msg.text = word;
    msg.lang = 'en-US'; // 设置为美式英语
    msg.rate = 0.8; // 语速稍慢，便于学习
    msg.pitch = 1;

    // 核心：Chrome 必须等语音加载完成
    function speak() {
        window.speechSynthesis.speak(msg);
        console.log("✅ 正在播放……");
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
        speak();
    } else {
        // 如果语音列表为空，等待加载
        window.speechSynthesis.onvoiceschanged = speak;
    }
}

// 更新统计信息
function updateStats(filteredWords) {
    const totalWords = filteredWords.length;
    const normalWords = filteredWords.length;
    const killWords = 0; // 单词连连看没有已斩杀单词的概念
    
    const totalWordsElement = document.getElementById('totalWords');
    if (totalWordsElement) {
        totalWordsElement.textContent = totalWords;
    }
    
    const normalWordsElement = document.getElementById('normalWords');
    if (normalWordsElement) {
        normalWordsElement.textContent = normalWords;
    }
    
    const killWordsElement = document.getElementById('killWords');
    if (killWordsElement) {
        killWordsElement.textContent = killWords;
    }
}

// 格式化时间
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours.toString().padStart(2, '0')} : ${(minutes % 60).toString().padStart(2, '0')} : ${(seconds % 60).toString().padStart(2, '0')}`;
}

// 更新计时器显示
function updateTimer() {
    if (isTimerRunning) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const timeElement = document.querySelector('.stats span:nth-child(3) strong');
        if (timeElement) {
            timeElement.textContent = formatTime(elapsedTime);
        }
    }
}

// 开始计时
function startTimer() {
    if (!isTimerRunning) {
        startTime = Date.now();
        isTimerRunning = true;
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer(); // 立即更新一次
    }
}

// 停止计时
function stopTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
    }
}

// 初始化游戏
async function initGame() {
    try {
        const response = await fetch(`${API_BASE_URL}`);
        words = await response.json();
        
        // 获取kill筛选条件
        const killFilter = document.getElementById('posFilter').value;
        
        // 过滤单词
        let normalWords = [...words];
        
        // 应用kill筛选
        if (killFilter === 'unkilled') {
            normalWords = normalWords.filter(word => !word.kill);
        } else if (killFilter === 'killed') {
            normalWords = normalWords.filter(word => word.kill);
        }
        // 'all' 选项不做过滤
        
        // 去重逻辑
        const seenWords = new Set();
        normalWords = normalWords.filter(word => {
            const wordKey = word.word.toLowerCase();
            if (seenWords.has(wordKey)) {
                return false;
            }
            seenWords.add(wordKey);
            return true;
        });
        
        // 打乱右侧释义顺序
        const shuffledMeanings = [...normalWords].sort(() => Math.random() - 0.5);
        
        renderWords(normalWords, shuffledMeanings);
        initClickEvents();
        updateStats(normalWords);
        
        // 添加计时按钮事件监听
        const startButton = document.querySelector('.stats button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                if (isTimerRunning) {
                    stopTimer();
                    startButton.textContent = '开始计时';
                    startButton.style.backgroundColor = ''; // 恢复原色
                } else {
                    startTimer();
                    startButton.textContent = '结束计时';
                    startButton.style.backgroundColor = "#ffcc44"; // 黄色
                }
            });
        }
    } catch (error) {
        console.error('初始化游戏失败:', error);
    }
}

// 渲染单词
function renderWords(englishWords, meaningWords) {
    const englishContainer = document.getElementById('normalWordContainer');
    const meaningContainer = document.getElementById('killWordContainer');
    
    englishContainer.innerHTML = '';
    meaningContainer.innerHTML = '';
    
    if (currentLanguage === 'english') {
        // 英语-释义配对
        englishWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'english';
            wordCard.textContent = word.word;
            englishContainer.appendChild(wordCard);
        });
        
        meaningWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'meaning';
            wordCard.textContent = word.meaning;
            meaningContainer.appendChild(wordCard);
        });
    } else {
        // 释义-英语配对
        englishWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'meaning';
            wordCard.textContent = word.meaning;
            englishContainer.appendChild(wordCard);
        });
        
        meaningWords.forEach(word => {
            const wordCard = document.createElement('div');
            wordCard.className = 'word-card';
            wordCard.dataset.id = word.id;
            wordCard.dataset.type = 'english';
            wordCard.textContent = word.word;
            meaningContainer.appendChild(wordCard);
        });
    }
}

// 初始化点击事件
function initClickEvents() {
    const wordCards = document.querySelectorAll('.word-card');
    
    wordCards.forEach(card => {
        card.addEventListener('click', handleWordClick);
    });
}

// 处理单词点击
function handleWordClick(event) {
    const clickedCard = event.target;
    const clickedId = parseInt(clickedCard.dataset.id);
    const clickedType = clickedCard.dataset.type;
    
    // 如果已经匹配过，不处理
    if (matchedPairs.has(clickedId)) {
        return;
    }
    
    // 播放发音并添加视觉反馈
    const wordObj = words.find(w => w.id === clickedId);
    if (wordObj && wordObj.word) {
        speakWord(wordObj.word);
        
        // 添加发音时的视觉反馈
        clickedCard.classList.add('speaking');
        setTimeout(() => {
            clickedCard.classList.remove('speaking');
        }, 1000);
    }
    
    // 如果是第一个点击的单词
    if (!lastClickedWord) {
        lastClickedWord = { id: clickedId, type: clickedType, element: clickedCard };
        clickedCard.style.backgroundColor = '#e3f2fd';
        return;
    }
    
    // 如果点击的是同一类型的单词，重置
    if (lastClickedWord.type === clickedType) {
        lastClickedWord.element.style.backgroundColor = '';
        lastClickedWord = { id: clickedId, type: clickedType, element: clickedCard };
        clickedCard.style.backgroundColor = '#e3f2fd';
        return;
    }
    
    // 检查是否匹配
    if (lastClickedWord.id === clickedId) {
        // 匹配成功
        lastClickedWord.element.style.backgroundColor = '#c8e6c9';
        clickedCard.style.backgroundColor = '#c8e6c9';
        matchedPairs.add(clickedId);
        
        // 获取当前筛选后的单词数量
        const gradeFilter = document.getElementById('gradeFilter').value;
        const unitFilter = document.getElementById('unitFilter').value;
        const killFilter = document.getElementById('posFilter').value;
        
        let filteredWords = [...words];
        
        // 应用kill筛选
        if (killFilter === 'unkilled') {
            filteredWords = filteredWords.filter(word => !word.kill);
        } else if (killFilter === 'killed') {
            filteredWords = filteredWords.filter(word => word.kill);
        }
        // 'all' 选项不做过滤
        
        if (gradeFilter) {
            filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
        }
        
        if (unitFilter) {
            filteredWords = filteredWords.filter(word => String(word.unit) === unitFilter);
        }
        
        // 去重
        const seenWords = new Set();
        filteredWords = filteredWords.filter(word => {
            const wordKey = word.word.toLowerCase();
            if (seenWords.has(wordKey)) {
                return false;
            }
            seenWords.add(wordKey);
            return true;
        });
        
        // 检查是否全部匹配
        if (matchedPairs.size === filteredWords.length) {
            setTimeout(() => {
                // 尝试进入下一单元
                if (gradeFilter && unitFilter) {
                    const currentUnit = parseInt(unitFilter);
                    const nextUnit = currentUnit + 1;
                    
                    // 检查下一单元是否存在
                    const nextUnitExists = words.some(word => word.grade === gradeFilter && word.unit === nextUnit.toString());
                    
                    if (nextUnitExists) {
                        // 进入下一单元
                        stopTimer(); // 停止计时
                        document.getElementById('unitFilter').value = nextUnit.toString();
                        applyFilters();
                    } else {
                        // 没有下一单元
                        stopTimer(); // 停止计时
                        alert('恭喜，本单元结束！');
                    }
                } else {
                    // 没有选择单元或年级
                    stopTimer(); // 停止计时
                    alert('恭喜！全对了！');
                }
            }, 500);
        }
    } else {
        // 匹配失败
        lastClickedWord.element.style.backgroundColor = '#ffcdd2';
        clickedCard.style.backgroundColor = '#ffcdd2';
        
        // 恢复原色
        setTimeout(() => {
            lastClickedWord.element.style.backgroundColor = '';
            clickedCard.style.backgroundColor = '';
        }, 1000);
    }
    
    // 重置最后点击的单词
    lastClickedWord = null;
}

// 应用筛选条件
function applyFilters() {
    const gradeFilter = document.getElementById('gradeFilter').value;
    const unitFilter = document.getElementById('unitFilter').value;
    const killFilter = document.getElementById('posFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    
    // 更新当前语言配对
    currentLanguage = languageFilter;
    
    // 过滤单词
    let filteredWords = [...words];
    
    // 应用kill筛选
    if (killFilter === 'unkilled') {
        filteredWords = filteredWords.filter(word => !word.kill);
    } else if (killFilter === 'killed') {
        filteredWords = filteredWords.filter(word => word.kill);
    }
    // 'all' 选项不做过滤
    
    if (gradeFilter) {
        filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
    }
    
    if (unitFilter) {
        filteredWords = filteredWords.filter(word => String(word.unit) === unitFilter);
    }
    
    // 排序
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortFilter === 'random') {
        // 随机排序
        filteredWords.sort(() => Math.random() - 0.5);
    } else {
        filteredWords.sort((a, b) => a.id - b.id);
    }
    
    // 去重逻辑
    const seenWords = new Set();
    filteredWords = filteredWords.filter(word => {
        const wordKey = word.word.toLowerCase();
        if (seenWords.has(wordKey)) {
            return false;
        }
        seenWords.add(wordKey);
        return true;
    });
    
    // 打乱右侧顺序
    const shuffledMeanings = [...filteredWords].sort(() => Math.random() - 0.5);
    
    // 重新渲染
    renderWords(filteredWords, shuffledMeanings);
    initClickEvents();
    updateStats(filteredWords);
    
    // 重置匹配状态
    matchedPairs.clear();
    lastClickedWord = null;
    
    // 重新添加计时按钮事件监听
    const startButton = document.querySelector('.stats button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (isTimerRunning) {
                stopTimer();
                startButton.textContent = '开始计时';
                startButton.style.backgroundColor = ''; // 恢复原色
            } else {
                startTimer();
                startButton.textContent = '结束计时';
                startButton.style.backgroundColor = '#ffcc44'; // 黄色
            }
        });
    }
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', function() {
    // 唤醒语音引擎 - 确保语音列表已加载
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        
        // Chrome需要等待语音加载完成
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                console.log('✅ 语音引擎已就绪');
            };
        }
    }
    
    console.log('🎮 单词连连看游戏已加载');
    initGame();
});
