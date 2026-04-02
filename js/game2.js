const API_BASE_URL = 'http://localhost:5000/api/words';
let words = [];
let filteredWords = [];
let currentWordIndex = 0;
let correctCount = 0;


// 🎵 音频对象预加载
const sounds = {
    click: new Audio('/sounds/click01.mp3'),
    correct: new Audio('/sounds/correct.mp3'),
    wrong: new Audio('/sounds/wrong.mp3'),
    success: new Audio('/sounds/success.mp3')
};

// 预加载声音
function preloadSounds() {
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.volume = 1; // 设置音量
    });
}

// 播放声音
function playSound(soundName) {
    const sound = sounds[soundName];
    if (sound) {
        sound.currentTime = 0; // 重置播放位置
        sound.play().catch(e => console.log('声音播放失败:', e));
    }
}

// 简单的词形还原函数
function lemmatize(word) {
    if (word.length < 2) {
        return word.toLowerCase();
    }
    
    const rules = [
        { suffix: 'ies', replace: 'y' },
        { suffix: 'ied', replace: 'y' },
        { suffix: 's', replace: '' },
        { suffix: 'es', replace: '' },
        { suffix: 'ing', replace: '' },
        { suffix: 'est', replace: '' },
        { suffix: 'er', replace: '' },
        { suffix: 'ed', replace: '' },
        { suffix: 'ly', replace: '' }
    ];
    
    word = word.toLowerCase();
    
    for (const rule of rules) {
        if (word.endsWith(rule.suffix) && word.length > rule.suffix.length) {
            return word.slice(0, -rule.suffix.length) + rule.replace;
        }
    }
    
    return word;
}

// 检查两个单词是否是同一个词的不同形式
function isSameWord(word1, word2) {
    return lemmatize(word1) === lemmatize(word2);
}

// 测试词形还原功能
function testLemmatize() {
    console.log('=== 测试词形还原 ===');
    console.log('feature ->', lemmatize('feature'));
    console.log('features ->', lemmatize('features'));
    console.log('isSameWord(feature, features) ->', isSameWord('feature', 'features'));
    console.log('=== 测试结束 ===');
}

// 初始化游戏
async function initGame() {
    try {
        // 🎵 预加载声音
        preloadSounds();
        
        const response = await fetch(`${API_BASE_URL}`);
        words = await response.json();
        
        console.log('=== 游戏初始化 ===');
        console.log('加载单词数量:', words.length);
        
        testLemmatize();
        
        applyFilters();
        initInputEvents();
    } catch (error) {
        console.error('初始化游戏失败:', error);
    }
}

// 渲染单词
function renderWord(word) {
    console.log('renderWord 被调用:', word.word);
    
    const meaningContainer = document.getElementById('meaningContainer');
    const sentenceContainer = document.getElementById('sentenceContainer');
    
    meaningContainer.innerHTML = `<div class="word-meaning" data-id="${word.id}">${word.meaning}</div>`;
    
    const sentence = word.example || '无例句';
    let sentenceWithBlank = sentence;
    
    const matches = [];
    const wordRegex = /\b\w+\b/g;
    let match;
    
    while ((match = wordRegex.exec(sentence)) !== null) {
        const sentenceWord = match[0];
        if (isSameWord(word.word, sentenceWord)) {
            matches.push({
                original: sentenceWord,
                index: match.index
            });
        }
    }
    
    if (matches.length > 0) {
        const firstMatch = matches[0];
        const replacement = `<input type="text" class="blank" placeholder="________" data-word="${firstMatch.original}">`;
        sentenceWithBlank = sentenceWithBlank.substring(0, firstMatch.index) + replacement + sentenceWithBlank.substring(firstMatch.index + firstMatch.original.length);
    }
    
    sentenceContainer.innerHTML = `<div class="sentence">${sentenceWithBlank}</div>`;
    
    const blank = document.querySelector('.blank');
    if (blank) {
        blank.focus();
    }
    
    const meaningElement = document.querySelector('.word-meaning');
    meaningElement.addEventListener('click', () => {
        showWordTooltip(word);
    });
}

// 初始化输入事件
function initInputEvents() {
    document.removeEventListener('input', handleInput);
    document.removeEventListener('keydown', handleEnterKey);
    
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleEnterKey);
}

// 处理输入事件
function handleInput(event) {
    const blank = event.target;
    if (!blank || blank.disabled || blank.tagName !== 'INPUT' || !blank.classList.contains('blank')) return;
    playSound('click');
}

// 处理回车键
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        const blank = document.querySelector('.blank:not([disabled])');
        if (blank && blank.value.trim().length > 0) {
            event.preventDefault();
            validateAnswer(blank);
        }
    }
}

// 统一的验证逻辑
function validateAnswer(blank) {
    const input = blank.value.trim().toLowerCase();
    const expectedWord = blank.dataset.word.toLowerCase();
    
    if (isSameWord(input, expectedWord)) {
        // 🎵 播放正确声音
        playSound('correct');
        
        blank.disabled = true;
        blank.classList.add('correct');
        correctCount++;
        
        const isComplete = (correctCount === filteredWords.length);
        
        if (isComplete) {
            // 🎵 播放成功声音
            playSound('success');
            setTimeout(() => {
                alert('恭喜！全对了！');
            }, 500);
            return;
        }
        
        setTimeout(() => {
            currentWordIndex++;
            if (currentWordIndex < filteredWords.length) {
                renderWord(filteredWords[currentWordIndex]);
            }
        }, 300);
    } else {
        // 🎵 播放错误声音
        playSound('wrong');
        
        blank.classList.add('error');
        setTimeout(() => {
            blank.classList.remove('error');
            blank.value = '';
        }, 500);
    }
}

// 显示单词详情
function showWordTooltip(word) {
    const tooltip = document.createElement('div');
    tooltip.className = 'word-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-item"><strong>单词:</strong> <span>${word.word}</span></div>
            <div class="tooltip-item"><strong>释义:</strong> <span>${word.meaning}</span></div>
            <div class="tooltip-item"><strong>词性:</strong> <span>${word.pos || '无'}</span></div>
            <div class="tooltip-item"><strong>音标:</strong> <span>${word.phonetic || '无'}</span></div>
            <div class="tooltip-item"><strong>例句:</strong> <span>${word.example || '无'}</span></div>
            <div class="tooltip-item"><strong>联想词:</strong> <span>${word.related || '无'}</span></div>
        </div>
    `;
    document.body.appendChild(tooltip);
    
    const meaningElement = document.querySelector('.word-meaning');
    const rect = meaningElement.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = rect.bottom + 8 + 'px';
    tooltip.style.display = 'block';
    
    setTimeout(() => {
        document.addEventListener('click', () => {
            tooltip.remove();
        }, { once: true });
    }, 0);
}

// 应用筛选条件
function applyFilters() {
    console.log('=== applyFilters 被调用 ===');
    
    const gradeFilter = document.getElementById('gradeFilter').value;
    const unitFilter = document.getElementById('unitFilter').value;
    const posFilter = document.getElementById('posFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;
    
    filteredWords = words.filter(word => !word.kill);
    
    if (gradeFilter) {
        filteredWords = filteredWords.filter(word => word.grade === gradeFilter);
    }
    
    if (unitFilter) {
        filteredWords = filteredWords.filter(word => String(word.unit) === unitFilter);
    }
    
    if (posFilter) {
        filteredWords = filteredWords.filter(word => {
            if (!word.pos) return false;
            const posList = word.pos.split(/[、\/，,]+/).map(p => p.trim());
            return posList.includes(posFilter);
        });
    }
    
    if (sortFilter === 'az') {
        filteredWords.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortFilter === 'random') {
        filteredWords.sort(() => Math.random() - 0.5);
    } else {
        filteredWords.sort((a, b) => a.id - b.id);
    }
    
    // ✅ 去重逻辑
    const seenWords = new Set();
    filteredWords = filteredWords.filter(word => {
        const wordKey = word.word.toLowerCase();
        if (seenWords.has(wordKey)) {
            return false;
        }
        seenWords.add(wordKey);
        return true;
    });
    
    document.getElementById('normalWords').textContent = filteredWords.length;
    
    currentWordIndex = 0;
    correctCount = 0;
    
    console.log('去重后 filteredWords.length:', filteredWords.length);
    console.log('=== applyFilters 结束 ===\n');
    
    if (filteredWords.length > 0) {
        renderWord(filteredWords[currentWordIndex]);
    } else {
        document.getElementById('meaningContainer').innerHTML = '<div class="loading">没有符合条件的单词</div>';
        document.getElementById('sentenceContainer').innerHTML = '';
    }
}

window.addEventListener('DOMContentLoaded', initGame);