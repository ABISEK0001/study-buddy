document.addEventListener('DOMContentLoaded', () => {
    // Views
    const homeView = document.getElementById('homeView');
    const loadingView = document.getElementById('loadingView');
    const summaryView = document.getElementById('summaryView');
    const quizView = document.getElementById('quizView');
    const statusText = document.getElementById('currentPageStatus');

    // Controls
    const summarizeBtn = document.getElementById('summarizeBtn');
    const quizBtn = document.getElementById('quizBtn');
    const noteInput = document.getElementById('noteInput');
    const summaryText = document.getElementById('summaryText');
    const quizContent = document.getElementById('quizContent');
    const loaderText = document.getElementById('loaderText');
    const errorMessage = document.getElementById('errorMessage');

    // Navigation Buttons
    const backToHome = document.getElementById('backToHomeFromSummary');
    const backToSummary = document.getElementById('backToSummary');
    const restartBtn = document.getElementById('restartBtn');
    const logoHome = document.getElementById('logoHome');

    // Dashboard Nav Cards
    const navToInput = document.getElementById('navToInput');
    const navToSummary = document.getElementById('navToSummary');
    const navToQuiz = document.getElementById('navToQuiz');

    let currentSummary = '';

    const switchView = (viewName) => {
        // Hide all views
        [homeView, loadingView, summaryView, quizView].forEach(v => v.classList.remove('active-view'));

        // Show target view
        switch (viewName) {
            case 'home':
                homeView.classList.add('active-view');
                statusText.textContent = 'Dashboard';
                break;
            case 'loading':
                loadingView.classList.add('active-view');
                break;
            case 'summary':
                summaryView.classList.add('active-view');
                statusText.textContent = 'Summary';
                break;
            case 'quiz':
                quizView.classList.add('active-view');
                statusText.textContent = 'Practice Quiz';
                break;
        }
        window.scrollTo(0, 0);
    };

    const showLoading = (text) => {
        loaderText.textContent = text;
        switchView('loading');
    };

    const showError = (msg) => {
        switchView('home');
        errorMessage.textContent = msg;
        errorMessage.style.display = 'block';
    };

    // --- Summarize Logic ---
    summarizeBtn.addEventListener('click', async () => {
        const text = noteInput.value.trim();

        if (!text) {
            showError('Please paste some notes first!');
            return;
        }

        showLoading('AI is reading your notes...');
        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (data.error) {
                showError(data.error);
            } else {
                currentSummary = data.summary;
                summaryText.textContent = data.summary;
                updateNavState();
                switchView('summary');
            }
        } catch (error) {
            showError('Server connection failed. Is the backend running?');
        }
    });

    // --- Quiz Logic ---
    quizBtn.addEventListener('click', async () => {
        if (!currentSummary) {
            switchView('home');
            return;
        }

        showLoading('Creating your practice test...');

        try {
            const response = await fetch('/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ summary: currentSummary })
            });

            const data = await response.json();

            if (data.error) {
                showError(data.error);
            } else {
                renderQuiz(data.quiz);
                navToQuiz.classList.remove('disabled');
                switchView('quiz');
            }
        } catch (error) {
            showError('Failed to generate quiz. Try again later.');
        }
    });

    const renderQuiz = (questions) => {
        quizContent.innerHTML = '';

        if (questions.length === 0) {
            quizContent.innerHTML = '<div class="card"><p>Could not generate a quiz from this text. Try a longer technical subject!</p></div>';
            return;
        }

        questions.forEach((q, qIdx) => {
            const qCard = document.createElement('div');
            qCard.className = 'question-card';

            const qTitle = document.createElement('h3');
            qTitle.textContent = `${qIdx + 1}. ${q.question}`;
            qCard.appendChild(qTitle);

            const optionsGrid = document.createElement('div');
            optionsGrid.className = 'options-grid';

            q.options.forEach(opt => {
                const optDiv = document.createElement('div');
                optDiv.className = 'option';
                optDiv.textContent = opt;

                optDiv.addEventListener('click', () => {
                    if (opt === q.answer) {
                        optDiv.classList.add('correct');
                        optDiv.innerHTML += ' <i class="fas fa-check-circle"></i>';
                    } else {
                        optDiv.classList.add('wrong');
                        optDiv.innerHTML += ' <i class="fas fa-times-circle"></i>';

                        Array.from(optionsGrid.children).forEach(child => {
                            if (child.textContent.includes(q.answer)) {
                                child.classList.add('correct');
                            }
                        });
                    }
                    Array.from(optionsGrid.children).forEach(child => {
                        child.style.pointerEvents = 'none';
                    });
                });
                optionsGrid.appendChild(optDiv);
            });

            qCard.appendChild(optionsGrid);
            quizContent.appendChild(qCard);
        });
    };

    // Navigation Handlers
    backToHome.addEventListener('click', () => switchView('home'));
    backToSummary.addEventListener('click', () => switchView('summary'));

    restartBtn.addEventListener('click', () => {
        noteInput.value = '';
        currentSummary = '';
        navToSummary.classList.add('disabled');
        navToQuiz.classList.add('disabled');
        switchView('home');
    });

    logoHome.addEventListener('click', () => switchView('home'));

    // Dashboard Nav Card Listeners
    navToInput.addEventListener('click', () => switchView('home'));
    navToSummary.addEventListener('click', () => {
        if (!navToSummary.classList.contains('disabled')) switchView('summary');
    });
    navToQuiz.addEventListener('click', () => {
        if (!navToQuiz.classList.contains('disabled')) switchView('quiz');
    });

    // Update nav state after summary/quiz generation
    const updateNavState = () => {
        if (currentSummary) {
            navToSummary.classList.remove('disabled');
        }
        // Quiz state is simple check if quizContent has children handled after render
    };
});
