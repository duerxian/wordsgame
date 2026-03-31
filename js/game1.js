const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let matchedPairs = new Set();
let lastClickedWord = null;
let currentLanguage = 'english'; // 默认英语-释义配对

// 初始化游戏
async function initGame() {
    try {
        const response = await fetch(`${API_BASE_URL}`);
        words = await response.json();
        
        // 过滤出待斩杀单词
        const normalWords = words.filter(word => !word.kill);
        
        // 打乱右侧释义顺序
        const shuffledMeanings = [...normalWords].sort(() => Math.random() - 0.5);
        
        renderWords(normalWords, shuffledMeanings);
        initClickEvents();
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
        
        // 检查是否全部匹配
        if (matchedPairs.size === words.filter(word => !word.kill).length) {
            setTimeout(() => {
                alert('恭喜！全对了！');
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
    
    // 打乱右侧顺序
    const shuffledMeanings = [...filteredWords].sort(() => Math.random() - 0.5);
    
    // 重新渲染
    renderWords(filteredWords, shuffledMeanings);
    initClickEvents();
    
    // 重置匹配状态
    matchedPairs.clear();
    lastClickedWord = null;
}

// 页面加载完成后初始化游戏
window.addEventListener('DOMContentLoaded', initGame);