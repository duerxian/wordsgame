const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let matchedPairs = new Set();
let lastClickedWord = null;
let currentLanguage = 'english'; // 默认英语-释义配对
let timerInterval = null;
let startTime = 0;
let isTimerRunning = false;

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
        
        // 过滤出待斩杀单词
        let normalWords = words.filter(word => !word.kill);
        
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
        const posFilter = document.getElementById('posFilter').value;
        
        let filteredWords = words.filter(word => !word.kill);
        
        if (gradeFilter) {
            filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
        }
        
        if (unitFilter) {
            filteredWords = filteredWords.filter(word => word.unit === unitFilter);
        }
        
        if (posFilter) {
            filteredWords = filteredWords.filter(word => word.pos === posFilter);
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
    const posFilter = document.getElementById('posFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    
    // 更新当前语言配对
    currentLanguage = languageFilter;
    
    // 过滤单词
    let filteredWords = words.filter(word => !word.kill);
    
    if (gradeFilter) {
        filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
    }
    
    if (unitFilter) {
        filteredWords = filteredWords.filter(word => word.unit === unitFilter);
    }
    
    if (posFilter) {
        filteredWords = filteredWords.filter(word => word.pos === posFilter);
    }
    
    // 排序
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
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
window.addEventListener('DOMContentLoaded', initGame);