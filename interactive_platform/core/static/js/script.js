// --- Início da Configuração do Pyodide (robusto) ---
let pyodide;
let pyodideReady = false;

// evita inicialização duplicada em caso de script incluído mais de uma vez
if (!window.__pyodideReadyPromise) {
    console.log("Carregando Pyodide...");
    window.__pyodideReadyPromise = loadPyodide().then(_py => {
        pyodide = _py;
        pyodideReady = true;
        console.log("Pyodide pronto para uso.");
        return _py;
    });
} else {
    // já iniciado em outro lugar
    window.__pyodideReadyPromise.then(_py => {
        pyodide = _py;
        pyodideReady = true;
    });
}
// --- Fim da Configuração do Pyodide ---


// --- Lógica do Glossário ---
const glossaryToggle = document.getElementById('glossary-toggle');
const glossaryModal = document.getElementById('glossary-modal-overlay');
const glossaryCloseBtn = document.querySelector('.glossary-modal-close-btn');

if (glossaryToggle && glossaryModal) {
    glossaryToggle.addEventListener('click', () => {
        glossaryModal.style.display = 'flex';
    });
}

if (glossaryCloseBtn) {
    glossaryCloseBtn.addEventListener('click', () => {
        glossaryModal.style.display = 'none';
    });
}
if (glossaryModal) {
    glossaryModal.addEventListener('click', (e) => {
        if (e.target === glossaryModal) glossaryModal.style.display = 'none';
    });
}

/**
 * Executa código Python usando Pyodide e exibe o resultado.
 * @param {string} code - O código Python a ser executado.
 * @param {string} outputId - O ID do elemento onde a saída será exibida.
 */
async function runPythonCode(code, outputId) {
    const output = document.getElementById(outputId);
    if (!pyodideReady) {
        output.textContent = "Aguarde, o ambiente Python está carregando...";
        await window.__pyodideReadyPromise; // Espera o Pyodide carregar
    }
    output.textContent = "Executando...";

    try {
        // Marca a atividade como concluída ao executar
        const activityContainer = output.closest('.trackable-activity');
        if (activityContainer && !activityContainer.classList.contains('completed')) {
            activityContainer.classList.add('completed');
            checkStepCompletion(currentStep);
        }

        // Redireciona a saída padrão do Python
        pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
        `);
        await pyodide.runPythonAsync(code);
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        output.textContent = stdout ? stdout.trim() : "Código executado sem saída.";
    } catch (err) {
        output.textContent = `Erro: ${err}`;
    }
}

// Controle de navegação entre etapas
let currentStep = 1;
const totalSteps = 15;

function saveAndNotifyProgress(stepNumber) {
    // Salva o progresso no localStorage. Desbloqueia a PRÓXIMA etapa.
    const unlockedStep = stepNumber + 1;
    localStorage.setItem('unlockedStep', unlockedStep);

    // Envia uma mensagem para a página pai (o mapa) para que ela saiba do progresso
    // Progresso reativado!
    if (window.parent) {
        window.parent.postMessage({
            type: 'UPDATE_PROGRESS',
            unlockedStep: unlockedStep
        }, '*'); // Em produção, use a URL exata da página do mapa no lugar de '*'
    }
}

function showStep(stepNumber) {
    const currentActiveStep = document.querySelector('.step.active');
    const newStep = document.getElementById(`step-${stepNumber}`);

    if (currentActiveStep) {
        currentActiveStep.classList.remove('active');
    }
    if (newStep) {
        newStep.classList.add('active');
    }

    currentStep = stepNumber;

}

/**
 * NOVO: Preenche o painel de resultados finais na Etapa 15.
 */
function populateFinalResults() {
    const scoreEl = document.getElementById('result-score');
    const timeEl = document.getElementById('result-time');

    if (!scoreEl || !timeEl) return;

    const score = localStorage.getItem('playerScore') || '0';
    const timeInSeconds = localStorage.getItem('completionTimeSeconds');

    scoreEl.textContent = `${score} Pontos`;

    if (timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

/**
 * Verifica se todas as atividades de uma etapa foram concluídas.
 * Se sim, dispara um evento 'step:completed'.
 * @param {number} stepNumber - O número da etapa a ser verificada.
 */
function checkStepCompletion(stepNumber) {
    const stepElement = document.getElementById(`step-${stepNumber}`);
    if (!stepElement) return;

    const totalActivities = parseInt(stepElement.dataset.totalActivities || '0');

    // Se a etapa não tem atividades, consideramos completa por padrão.
    if (totalActivities === 0) {
        stepElement.dispatchEvent(new CustomEvent('step:completed', { detail: { step: stepNumber } }));
        return;
    }

    const completedActivities = stepElement.querySelectorAll('.trackable-activity.completed').length;

    if (completedActivities >= totalActivities) {
        // Dispara um evento para indicar que a etapa foi concluída.
        stepElement.dispatchEvent(new CustomEvent('step:completed', { detail: { step: stepNumber } }));
        // Habilita o botão de desbloqueio diretamente
        const unlockBtn = stepElement.querySelector('.btn-unlock-next');
        if (unlockBtn) unlockBtn.disabled = false;
        // NOVO: Mostra o botão de resetar a avaliação
        const resetBtn = stepElement.querySelector('#reset-step-11-btn');
        if (resetBtn) resetBtn.style.display = 'inline-block';

        // NOVO: Lógica específica para exibir a pontuação final da Etapa 11
        if (stepNumber === 11) {
            let step11Score = 0;
            const activities = stepElement.querySelectorAll('.trackable-activity.completed');

            activities.forEach(activity => {
                // Verifica quizzes
                if (activity.classList.contains('quiz-container')) {
                    const correctOption = activity.querySelector('.quiz-option[data-correct="true"]');
                    const isRevealed = activity.querySelector('.btn-reveal-answer')?.classList.contains('revealed');
                    if (correctOption && correctOption.classList.contains('selected') && !isRevealed) {
                        step11Score += 10;
                    }
                }
                // Verifica desafios de código
                else if (activity.classList.contains('interactive-exercise')) {
                    const isCorrect = activity.dataset.correct === "true";
                    const isRevealed = activity.dataset.revealed === "true";
                    if (isCorrect && !isRevealed) {
                        step11Score += 10;
                    }
                }
            });

            const finalScoreFeedback = document.getElementById('step-11-final-score');
            finalScoreFeedback.textContent = `🎉 Você concluiu a avaliação e fez ${step11Score} de 50 pontos! 🎉`;
            finalScoreFeedback.className = 'feedback correct';
            finalScoreFeedback.style.display = 'block';
        }
    }
}

// NOVO: Função para resetar a Etapa 11
function resetStep11() {
    const stepElement = document.getElementById('step-11');
    if (!stepElement) return;

    let pointsToSubtract = 0;

    // 1. Calcular os pontos a serem subtraídos
    const activities = stepElement.querySelectorAll('.trackable-activity.completed');
    activities.forEach(activity => {
        if (activity.classList.contains('quiz-container')) {
            const correctOption = activity.querySelector('.quiz-option[data-correct="true"]');
            const isRevealed = activity.querySelector('.btn-reveal-answer')?.classList.contains('revealed');
            if (correctOption && correctOption.classList.contains('selected') && !isRevealed) {
                pointsToSubtract += 10;
            }
        } else if (activity.classList.contains('interactive-exercise')) {
            const isCorrect = activity.dataset.correct === "true";
            const isRevealed = activity.dataset.revealed === "true";
            if (isCorrect && !isRevealed) {
                pointsToSubtract += 10;
            }
        }
    });

    // 2. Enviar mensagem para subtrair os pontos
    if (pointsToSubtract > 0 && window.parent) {
        window.parent.postMessage({ type: 'ADD_POINTS', points: -pointsToSubtract }, '*');
    }

    // 3. Resetar o estado visual dos quizzes
    stepElement.querySelectorAll('.quiz-container').forEach(quiz => {
        quiz.classList.remove('completed', 'answered');
        quiz.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
        const feedback = quiz.querySelector('.feedback');
        if (feedback) feedback.style.display = 'none';
        const revealBtn = quiz.querySelector('.btn-reveal-answer');
        if (revealBtn) {
            revealBtn.disabled = false;
            revealBtn.classList.remove('revealed');
        }
    });

    // 4. Resetar o estado visual dos desafios de código
    stepElement.querySelectorAll('.interactive-exercise[id^="code-challenge-"]').forEach(challenge => {
        challenge.classList.remove('completed');
        challenge.dataset.correct = "false";
        challenge.dataset.revealed = "false";
        challenge.querySelector('.code-area').value = '';
        const output = challenge.querySelector('.exercise-output');
        if (output) output.textContent = '';
        const feedback = challenge.querySelector('.feedback');
        if (feedback) feedback.style.display = 'none';
        const checkBtn = challenge.querySelector('.check-code-btn');
        if (checkBtn) checkBtn.disabled = false;
        const revealBtn = challenge.querySelector('.btn-reveal-solution');
        if (revealBtn) revealBtn.disabled = false;
    });

    // 5. Esconder feedback final e resetar botões de navegação
    const finalScoreFeedback = document.getElementById('step-11-final-score');
    if (finalScoreFeedback) finalScoreFeedback.style.display = 'none';

    const unlockBtn = stepElement.querySelector('.btn-unlock-next');
    if (unlockBtn) unlockBtn.disabled = true;

    const resetBtn = stepElement.querySelector('#reset-step-11-btn');
    if (resetBtn) resetBtn.style.display = 'none';

    console.log(`Etapa 11 resetada. ${pointsToSubtract} pontos foram subtraídos.`);
}

// Lógica para alternar o tema (Dark/Light Mode)
const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');

    // Salvar a preferência no localStorage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Lógica para o formulário da Etapa 1
    const studentForm = document.getElementById('student-info-form');
    if (studentForm) {
        studentForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Impede o envio padrão

            // Coletar dados do formulário
            const name = document.getElementById('form-student-name').value;
            const age = document.getElementById('student-age').value;
            const experienceLevel = document.querySelector('input[name="experience-level"]:checked').value;
            const interestArea = document.querySelector('input[name="interest-area"]:checked').value;
            const avatar = document.querySelector('input[name="avatar"]:checked').value;

            // Criar objeto JSON
            const studentData = {
                name: name,
                age: parseInt(age),
                avatar: avatar,
                experienceLevel: experienceLevel,
                interestArea: interestArea
            };

            // Armazena os dados do aluno no localStorage para uso posterior
            localStorage.setItem('studentData', JSON.stringify(studentData));
            console.log('Dados do Aluno salvos no localStorage:', JSON.stringify(studentData));

            // NOVO: Inicia o cronômetro do curso se ainda não foi iniciado
            if (!localStorage.getItem('courseStartTime')) {
                localStorage.setItem('courseStartTime', new Date().getTime());
                console.log('Cronômetro do curso iniciado.');
            }

            // Feedback para o usuário
            const feedbackElement = document.getElementById('form-feedback');
            feedbackElement.textContent = '✅ Suas respostas foram salvas! Agora pode avançar.';
            feedbackElement.className = 'feedback correct';
            feedbackElement.style.display = 'block';

            // Marcar a atividade como completa (para habilitar o botão)
            const activityContainer = this.closest('.trackable-activity');
            if (activityContainer && !activityContainer.classList.contains('completed')) {
                activityContainer.classList.add('completed');
                checkStepCompletion(currentStep);

                // Habilita o botão de desbloqueio da Etapa 1 diretamente
                const unlockBtn = document.querySelector('#step-1 .btn-unlock-next');
                if (unlockBtn) unlockBtn.disabled = false;
            }
        });
    }

    // Verifica se a página foi carregada através de uma âncora (ex: #step-5) e mostra a etapa correta.
    const hash = window.location.hash;
    if (hash) {
        const stepFromHash = parseInt(hash.replace('#step-', ''));
        if (!isNaN(stepFromHash) && stepFromHash > 0 && stepFromHash <= totalSteps) {
            showStep(stepFromHash);
        } else {
            showStep(1); // Se a âncora for inválida, mostra a etapa 1
        }
    } else {
        // Se não houver âncora, mostra a etapa 1 por padrão.
        showStep(1);
    }

    // Listener centralizado para o evento de conclusão de etapa
    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('step:completed', (e) => {
            const stepNumber = e.detail.step;
            const stepElement = document.getElementById(`step-${stepNumber}`);
            const unlockBtn = stepElement.querySelector('.btn-unlock-next');
            if (unlockBtn) unlockBtn.disabled = false;
        });
    });

    // Garante que a lógica do exercício de associação da Etapa 4 seja carregada
    setupMatchingExercise('matching-exercise-1');

    // NOVO: Adiciona o listener para o botão de reset da Etapa 11
    const resetStep11Btn = document.getElementById('reset-step-11-btn');
    if (resetStep11Btn) {
        resetStep11Btn.addEventListener('click', resetStep11);
    }

    // --- Configuração dos botões de execução da Etapa 7 ---
    // Adiciona listeners aos botões da Etapa 7 usando seus novos IDs.
    // A verificação `if (btn)` evita erros caso o elemento não seja encontrado.
    const btn1 = document.getElementById('run-code-step1');
    if (btn1) btn1.addEventListener('click', () => {
        runPythonCode(document.getElementById('code-step1').value, 'output-step1');
    });

    const btn2 = document.getElementById('run-code-step2');
    if (btn2) btn2.addEventListener('click', () => {
        runPythonCode(document.getElementById('code-step2').value, 'output-step2');
    });

    const btn4 = document.getElementById('run-code-step4');
    if (btn4) btn4.addEventListener('click', () => {
        runPythonCode(document.getElementById('code-step4').value, 'output-step4');
    });

    const btn5 = document.getElementById('run-code-step5');
    if (btn5) btn5.addEventListener('click', () => {
        runPythonCode(document.getElementById('code-step5').value, 'output-step5');
    });
});

// Configurar quizzes
document.querySelectorAll('.quiz-option').forEach(option => {
    option.addEventListener('click', function () {
        const parent = this.parentElement;
        const quizContainer = this.closest('.quiz-container');

        // NOVO: Bloqueia a interação se a questão já foi respondida.
        // MODIFICADO: Exibe feedback visual para o usuário.
        if (quizContainer.classList.contains('answered')) {
            const feedback = quizContainer.querySelector('.feedback');
            feedback.textContent = 'Você já respondeu esta questão.';
            feedback.className = 'feedback incorrect';
            feedback.style.display = 'block';
            return;
        }

        // NOVO: Bloqueio definitivo para a etapa 13 se já foi finalizada
        if (localStorage.getItem('finalQuizCompleted') === 'true' && this.closest('#step-13')) {
            return; // Impede qualquer interação se a avaliação final já foi respondida.
        }

        const feedback = parent.nextElementSibling;

        // Remover seleções anteriores
        parent.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
        });

        // Marcar esta opção como selecionada
        this.classList.add('selected');

        // Verificar se está correta
        if (this.getAttribute('data-correct') === 'true') {
            this.classList.add('correct');
            feedback.textContent = '✅ Correto!';
            feedback.className = 'feedback correct';
            if (quizContainer && !quizContainer.classList.contains('completed')) {
                quizContainer.classList.add('completed');
                checkStepCompletion(currentStep);
            }
        } else {
            this.classList.add('incorrect');
            // MODIFICADO: Remove a mensagem "Tente novamente"
            feedback.textContent = '❌ Resposta incorreta. A resposta certa foi destacada.';
            feedback.className = 'feedback incorrect';

            // Mostrar a resposta correta
            const correctOptions = parent.querySelectorAll('[data-correct="true"]');
            correctOptions.forEach(opt => {
                opt.classList.add('correct');
            });
        }

        feedback.style.display = 'block';

        // NOVO: Adiciona pontos apenas se a resposta for correta e não tiver sido revelada.
        // MODIFICADO: Adiciona pontos apenas se o quiz estiver na Etapa 11.
        if (quizContainer.closest('#step-11')) {
            if (this.getAttribute('data-correct') === 'true' && !quizContainer.querySelector('.btn-reveal-answer')?.classList.contains('revealed')) {
                if (window.parent) {
                    window.parent.postMessage({ type: 'ADD_POINTS', points: 10 }, '*');
                }
            }
        }
        quizContainer.classList.add('answered'); // Marca como respondido para evitar re-pontuação na mesma sessão
    });
});

// Configurar botões para revelar quizzes
document.querySelectorAll('.btn-reveal').forEach(button => {
    button.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.style.display = 'block';
            this.style.display = 'none'; // Esconde o botão após o clique
        }
    });
});

async function runInteractivePythonCode(code, outputId) {
    const output = document.getElementById(outputId);
    if (!pyodideReady) {
        output.textContent = "Aguarde, o ambiente Python está carregando...";
        return;
    }
    output.textContent = "Executando código interativo...\n";

    // Substitui o input do Python pelo prompt do JS
    pyodide.globals.set("js_prompt", (s) => prompt(s));
    const pythonSetupCode = `
import sys
import io

sys.stdout = io.StringIO()
__builtins__.input = js_prompt
`;
    pyodide.runPython(pythonSetupCode);

    try {
        // Marca a atividade como concluída ao executar
        const activityContainer = output.closest('.trackable-activity');
        if (activityContainer && !activityContainer.classList.contains('completed')) {
            activityContainer.classList.add('completed');
            checkStepCompletion(currentStep);
        }

        await pyodide.runPythonAsync(code);

        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        output.textContent = stdout ? stdout.trim() : "Código executado sem saída.";
        return true; // Sucesso
    } catch (err) {
        output.textContent = `Erro: ${err}`;
        return false; // Falha
    } finally {
        // Restaura a saída padrão
        if (pyodideReady) {
            pyodide.runPython("sys.stdout = sys.__stdout__");
        }
    }
}

document.getElementById('run-rh360').addEventListener('click', async () => {
    const code = document.getElementById('rh360-code').value;
    const success = await runInteractivePythonCode(code, 'rh360-output');
    // Apenas marca como completo se o código rodar sem erros
    if (success) {
        const activityContainer = document.getElementById('run-rh360').closest('.trackable-activity');
        activityContainer.classList.add('completed');
        checkStepCompletion(currentStep);
    }
});

document.getElementById('reveal-rh360-solution').addEventListener('click', function () {
    const codeArea = document.getElementById('rh360-code');

    const solutionCode = `# Protótipo InovaTech - Módulo de Cadastro

# Solicitar informações do usuário
nome = input("Digite seu nome de usuário: ")
idade = int(input("Digite sua idade: "))
email = input("Digite seu e-mail: ")

# Calcular ano de nascimento (considerando 2024 como ano atual)
ano_atual = 2024
ano_nascimento = ano_atual - idade

# Exibir mensagem de boas-vindas
print("\\n--- Perfil Criado na InovaTech ---")
print("Usuário cadastrado com sucesso!")
print(f"Nome: {nome}")
print(f"Idade: {idade} anos")
print(f"E-mail: {email}")
print(f"Ano de nascimento: {ano_nascimento}")

# Verificar se é maior de idade
if idade >= 18:
    print("Status: MAIOR de idade")
else:
    print("Status: MENOR de idade")

print("\\nBem-vindo(a) à plataforma InovaTech!")`;

    codeArea.value = solutionCode;
});

// Lógica para salvar e carregar anotações da pesquisa no localStorage
const researchNotesTextarea = document.getElementById('research-notes');
const saveResearchBtn = document.getElementById('save-research-btn');
const researchFeedback = document.getElementById('research-feedback');

// Carrega as anotações salvas quando a página é iniciada
if (researchNotesTextarea) {
    const savedNotes = localStorage.getItem('pythonResearchNotes');
    if (savedNotes) {
        researchNotesTextarea.value = savedNotes;
    }
}

// Configura o botão para salvar as anotações
if (saveResearchBtn && researchNotesTextarea && researchFeedback) {
    saveResearchBtn.addEventListener('click', function () {
        const notes = researchNotesTextarea.value;
        localStorage.setItem('pythonResearchNotes', notes);

        const activityContainer = this.closest('.trackable-activity');
        if (activityContainer && !activityContainer.classList.contains('completed')) {
            activityContainer.classList.add('completed');
            checkStepCompletion(currentStep);
        }
        researchFeedback.textContent = '✅ Suas anotações foram salvas com sucesso no navegador!';
        researchFeedback.className = 'feedback correct';
        researchFeedback.style.display = 'block';
    });
}

// --- Lógica Genérica para Construtor de Código (Arrastar e Soltar) ---
function setupDragDropExercise(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const dropZone = container.querySelector('.code-drop-zone');
    const blockSource = container.querySelector('.code-block-source');
    const checkBtn = container.querySelector('.check-btn');
    const resetBtn = container.querySelector('.reset-btn');
    const feedback = container.querySelector('.feedback');
    const allBlocks = Array.from(blockSource.querySelectorAll('.code-block'));

    let draggedItem = null;

    blockSource.addEventListener('dragstart', e => {
        if (e.target.classList.contains('code-block')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    document.addEventListener('dragend', e => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('over');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedItem) {
            dropZone.appendChild(draggedItem);
        }
        dropZone.classList.remove('over');
    });

    checkBtn.addEventListener('click', () => {
        const blocksInZone = dropZone.querySelectorAll('.code-block');
        let isCorrect = true;

        if (blocksInZone.length !== allBlocks.length) {
            isCorrect = false;
        } else {
            blocksInZone.forEach((block, index) => {
                if (parseInt(block.dataset.order) !== index) {
                    isCorrect = false;
                }
            });
        }

        feedback.textContent = isCorrect ? '✅ Perfeito! O código está na ordem correta.' : '❌ Ops! A ordem dos blocos não está correta. Tente novamente.';
        feedback.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
        feedback.style.display = 'block';

        if (isCorrect) {
            const activityContainer = container.closest('.trackable-activity');
            activityContainer.classList.add('completed');
            checkStepCompletion(currentStep);
            confetti(); // Adiciona um efeito de comemoração!
        }
    });

    resetBtn.addEventListener('click', () => {
        const blocksInZone = dropZone.querySelectorAll('.code-block');
        blocksInZone.forEach(block => blockSource.appendChild(block));
        feedback.style.display = 'none';
    });
}

// Inicializa todos os exercícios de arrastar e soltar na página
document.addEventListener('DOMContentLoaded', () => {
    for (let i = 1; i <= 5; i++) {
        setupDragDropExercise(`dd-exercise-${i}`);
    }
});

// --- Lógica para Associação de Colunas (Matching Exercise) ---
function setupMatchingExercise(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const conceptsColumn = container.querySelector('#concepts-column');
    const definitionsColumn = container.querySelector('#definitions-column');
    const feedback = container.querySelector('#matching-feedback');
    const resetBtn = container.querySelector('#reset-matching-btn');
    const checkBtn = container.querySelector('#check-matching-btn');

    let draggedItem = null;

    conceptsColumn.addEventListener('dragstart', e => {
        if (e.target.classList.contains('matching-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        }
    });

    document.addEventListener('dragend', e => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    definitionsColumn.addEventListener('dragover', e => {
        e.preventDefault();
        const dropzone = e.target.closest('.matching-dropzone');
        if (dropzone && !dropzone.classList.contains('correct')) {
            dropzone.classList.add('over');
        }
    });

    definitionsColumn.addEventListener('dragleave', e => {
        const dropzone = e.target.closest('.matching-dropzone');
        if (dropzone) {
            dropzone.classList.remove('over');
        }
    });

    definitionsColumn.addEventListener('drop', e => {
        e.preventDefault();
        // Encontra a dropzone mais próxima, não importa se o alvo é a zona ou um item dentro dela.
        let dropzone = e.target;
        if (!dropzone.classList.contains('matching-dropzone')) {
            dropzone = dropzone.closest('.matching-dropzone');
        }

        if (dropzone && draggedItem) {
            dropzone.classList.remove('over');

            // Se a dropzone já contiver um item, devolva-o à coluna de origem.
            const existingItem = dropzone.querySelector('.matching-item');
            if (existingItem) {
                conceptsColumn.appendChild(existingItem);
                existingItem.draggable = true;
                existingItem.classList.remove('matched');
                // Limpa o status da dropzone se o item for removido
                dropzone.classList.remove('correct');
            }

            const isCorrect = draggedItem.dataset.matchId === dropzone.dataset.matchId;

            if (isCorrect) {
                dropzone.innerHTML = ''; // Limpa o texto placeholder
                dropzone.appendChild(draggedItem);
                draggedItem.draggable = false;
                draggedItem.classList.remove('dragging');
                draggedItem.classList.add('matched');
                dropzone.classList.add('correct');
                draggedItem = null;
            } else {
                dropzone.classList.add('incorrect');
                setTimeout(() => dropzone.classList.remove('incorrect'), 500);
            }
        }
    });

    checkBtn.addEventListener('click', () => {
        const totalActivities = conceptsColumn.querySelectorAll('.matching-item').length + definitionsColumn.querySelectorAll('.matching-item').length;
        const dropzones = definitionsColumn.querySelectorAll('.matching-dropzone');
        const allMatched = Array.from(dropzones).every(dz => dz.classList.contains('correct'));
        const matchedCount = definitionsColumn.querySelectorAll('.matching-dropzone.correct').length;

        if (allMatched && matchedCount === totalActivities) {
            feedback.textContent = '✅ Excelente! Todas as associações estão corretas.';
            feedback.className = 'feedback correct';
            feedback.style.display = 'block';

            const activityContainer = container.closest('.trackable-activity');
            if (activityContainer) activityContainer.classList.add('completed');
            checkStepCompletion(currentStep);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
            feedback.textContent = '❌ Ainda faltam associações ou algumas estão incorretas. Continue tentando!';
            feedback.className = 'feedback incorrect';
            feedback.style.display = 'block';
        }
    });

    resetBtn.addEventListener('click', () => {
        // A maneira mais fácil de resetar é recarregar a etapa, mas isso pode ser complexo.
        // Uma solução mais simples seria mover os elementos de volta.
        // Por enquanto, vamos apenas sugerir recarregar a página ou refazer a etapa.
        // Para uma implementação completa, seria necessário clonar os nós no início.
        // Por simplicidade, vamos recarregar a página da aula.
        window.location.reload();
    });
}

// Lógica para os Flip Cards (Cards de Estudo)
document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', function () {
        this.classList.toggle('is-flipped');
    });
});

// Lógica para o Modal de Empresas
const companyModalOverlay = document.getElementById('company-modal-overlay'); // Sem alterações aqui, pois o ID já é único
const modalCloseBtn = document.querySelector('.company-modal-close-btn'); // Alterado para buscar pela nova classe
const companyLogos = document.querySelectorAll('.company-logo');

const modalCompanyName = document.getElementById('modal-company-name');
const modalCompanyIcon = document.getElementById('modal-company-icon');
const modalCompanyUsage = document.getElementById('modal-company-usage');

companyLogos.forEach(logo => {
    logo.addEventListener('click', function () {
        const name = this.dataset.companyName;
        const icon = this.dataset.companyIcon;
        const usage = this.dataset.companyUsage;

        modalCompanyName.textContent = name;
        modalCompanyIcon.textContent = icon;
        modalCompanyUsage.textContent = usage;

        companyModalOverlay.style.display = 'flex';
    });
});

function closeModal() {
    companyModalOverlay.style.display = 'none';
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
companyModalOverlay.addEventListener('click', (e) => {
    if (e.target === companyModalOverlay) {
        closeModal();
    }
});

// --- Lógica para o Modal Genérico ---
const genericModalOverlay = document.getElementById('generic-modal-overlay');
const genericModalCloseBtn = document.querySelector('.generic-modal-close-btn');
const genericModalTitle = document.getElementById('generic-modal-title');
const genericModalText = document.getElementById('generic-modal-text');

function openGenericModal(title, text) {
    if (genericModalOverlay) {
        genericModalTitle.innerHTML = title;
        genericModalText.innerHTML = text;
        genericModalOverlay.style.display = 'flex';
    }
}

function closeGenericModal() {
    if (genericModalOverlay) {
        genericModalOverlay.style.display = 'none';
    }
}

if (genericModalCloseBtn) genericModalCloseBtn.addEventListener('click', closeGenericModal);
if (genericModalOverlay) genericModalOverlay.addEventListener('click', (e) => {
    if (e.target === genericModalOverlay) {
        closeGenericModal();
    }
});

// Botão específico da Etapa 4
const showPythonModalBtn = document.getElementById('show-python-modal-btn');
if (showPythonModalBtn) {
    showPythonModalBtn.addEventListener('click', () => {
        openGenericModal('E o Python? 🐍', '<strong>Python</strong> combina a simplicidade de uma linguagem <strong>interpretada</strong> com o poder da <strong>Programação Orientada a Objetos</strong>, tornando-o uma escolha versátil e poderosa. 🧙‍♂️🏗️');
    });
}

// NOVO: Botão para o modal sobre comentários
const showCommentsModalBtn = document.getElementById('show-comments-modal-btn');
if (showCommentsModalBtn) {
    showCommentsModalBtn.addEventListener('click', () => {
        openGenericModal('💡 A Importância dos Comentários', 'Um código bem comentado é um presente para sua equipe e para o seu "eu" do futuro. Comentários explicam o <strong>"porquê"</strong> de uma lógica complexa, não apenas o "o quê". Eles transformam um código funcional em um código compreensível e fácil de manter. Lembre-se: <strong>código claro é bom, código comentado é excelente!</strong>');
    });
}

// --- Lógica do Caça-Palavras ---
function setupWordSearch() {
    const gridElement = document.getElementById('word-search-grid');
    const listElement = document.getElementById('word-search-list');
    const feedbackElement = document.getElementById('word-search-feedback');
    const revealBtn = document.getElementById('reveal-word-btn');
    if (!gridElement) return;

    const gridSize = 12;
    const words = [
        { word: 'VARIAVEL', concept: '"Caixa" para guardar dados', found: false, start: [1, 0], end: [1, 7], colorClass: 'found-c1' },
        { word: 'FUNCAO', concept: 'Bloco de código reutilizável', found: false, start: [0, 0], end: [0, 5], colorClass: 'found-c2' },
        { word: 'LISTA', concept: 'Coleção ordenada e mutável', found: false, start: [3, 2], end: [3, 6], colorClass: 'found-c3' },
        { word: 'IF', concept: 'Estrutura de decisão', found: false, start: [7, 2], end: [7, 3], colorClass: 'found-c4' },
        { word: 'ELSE', concept: 'Caminho alternativo do "if"', found: false, start: [4, 0], end: [7, 0], colorClass: 'found-c5' },
        { word: 'PYTHON', concept: 'Linguagem de programação', found: false, start: [0, 9], end: [6, 9], colorClass: 'found-c6' },
        { word: 'FOR', concept: 'Loop para iterar sequências', found: false, start: [10, 1], end: [10, 3], colorClass: 'found-c7' },
        { word: 'INPUT', concept: 'Captura dados do usuário', found: false, start: [2, 11], end: [6, 11], colorClass: 'found-c8' },
        { word: 'PRINT', concept: 'Exibe dados na tela', found: false, start: [11, 6], end: [11, 10], colorClass: 'found-c1' },
        { word: 'DICT', concept: 'Coleção com chave-valor', found: false, start: [9, 5], end: [9, 8], colorClass: 'found-c2' }
    ];

    const grid = [
        ['F', 'U', 'N', 'C', 'A', 'O', 'L', 'P', 'O', 'P', 'Y', 'T'],
        ['V', 'A', 'R', 'I', 'A', 'V', 'E', 'L', 'U', 'Y', 'T', 'H'],
        ['M', 'B', 'N', 'S', 'D', 'F', 'G', 'H', 'N', 'T', 'R', 'I'],
        ['Q', 'W', 'L', 'I', 'S', 'T', 'A', 'Z', 'C', 'H', 'E', 'N'],
        ['E', 'C', 'V', 'B', 'N', 'M', 'K', 'J', 'A', 'O', 'W', 'P'],
        ['L', 'G', 'F', 'D', 'S', 'A', 'P', 'O', 'O', 'N', 'Q', 'U'],
        ['S', 'U', 'Y', 'T', 'R', 'E', 'W', 'Q', 'L', 'A', 'A', 'T'],
        ['E', 'J', 'I', 'F', 'H', 'G', 'F', 'D', 'S', 'S', 'S', 'X'],
        ['P', 'O', 'I', 'U', 'Y', 'T', 'R', 'E', 'W', 'D', 'D', 'C'],
        ['A', 'S', 'D', 'F', 'G', 'D', 'I', 'C', 'T', 'F', 'F', 'V'],
        ['Z', 'F', 'O', 'R', 'X', 'C', 'V', 'B', 'N', 'G', 'G', 'B'],
        ['Q', 'A', 'Z', 'W', 'S', 'X', 'P', 'R', 'I', 'N', 'T', 'N']
    ];

    let isSelecting = false;
    let selectedCells = [];

    // Gerar grade e lista
    gridElement.style.gridTemplateColumns = `repeat(${gridSize}, 35px)`;
    gridElement.style.gridTemplateRows = `repeat(${gridSize}, 35px)`;
    grid.forEach((row, r) => {
        row.forEach((letter, c) => {
            const cell = document.createElement('div');
            cell.className = 'word-search-cell';
            cell.textContent = letter;
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridElement.appendChild(cell);
        });
    });

    function updateWordList() {
        listElement.innerHTML = '';
        words.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.concept;
            if (item.found) {
                li.classList.add('found-word');
                // Adiciona a palavra encontrada ao lado do conceito
                const foundWordSpan = document.createElement('span');
                foundWordSpan.className = 'found-word-text';
                foundWordSpan.textContent = ` — ${item.word}`;
                li.appendChild(foundWordSpan);
            }
            listElement.appendChild(li);
        });
    }

    gridElement.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('word-search-cell')) {
            isSelecting = true;
            selectedCells = [e.target];
            e.target.classList.add('selected');
        }
    });

    gridElement.addEventListener('mouseover', (e) => {
        if (isSelecting && e.target.classList.contains('word-search-cell') && !selectedCells.includes(e.target)) {
            selectedCells.push(e.target);
            e.target.classList.add('selected');
        }
    });

    gridElement.addEventListener('mouseup', () => {
        isSelecting = false;
        const selectedWord = selectedCells.map(cell => cell.textContent).join('');

        const wordFound = words.find(w => !w.found && (w.word === selectedWord || w.word === selectedWord.split('').reverse().join('')));

        if (wordFound) {
            wordFound.found = true;
            selectedCells.forEach(cell => {
                cell.classList.add('found');
                cell.classList.add(wordFound.colorClass);
            });
        }

        selectedCells.forEach(cell => cell.classList.remove('selected'));
        selectedCells = [];
        updateWordList();

        if (words.every(w => w.found)) {
            feedbackElement.textContent = '🎉 Parabéns! Você encontrou todas as palavras!';
            feedbackElement.className = 'feedback correct';
            feedbackElement.style.display = 'block';

            const activityContainer = gridElement.closest('.trackable-activity');
            if (activityContainer) {
                activityContainer.classList.add('completed');
                checkStepCompletion(currentStep);
            }
        }
    });

    updateWordList();

    // Lógica para o botão de revelar
    revealBtn.addEventListener('click', () => {
        const wordToReveal = words.find(w => !w.found);
        if (!wordToReveal) {
            revealBtn.disabled = true;
            return;
        }

        wordToReveal.found = true;
        const { start, end } = wordToReveal;
        const cellsToReveal = [];

        if (start[0] === end[0]) { // Palavra horizontal
            for (let c = Math.min(start[1], end[1]); c <= Math.max(start[1], end[1]); c++) {
                cellsToReveal.push(gridElement.querySelector(`[data-row="${start[0]}"][data-col="${c}"]`));
            }
        } else if (start[1] === end[1]) { // Palavra vertical
            for (let r = Math.min(start[0], end[0]); r <= Math.max(start[0], end[0]); r++) {
                cellsToReveal.push(gridElement.querySelector(`[data-row="${r}"][data-col="${start[1]}"]`));
            }
        }

        cellsToReveal.forEach(cell => {
            if (cell) {
                cell.classList.add('found'); // Marca como encontrada
                cell.classList.add(wordToReveal.colorClass); // Aplica a cor específica
            }
        });

        updateWordList();

        if (words.every(w => w.found)) {
            feedbackElement.textContent = '🎉 Parabéns! Você encontrou todas as palavras!';
            feedbackElement.className = 'feedback correct';
            feedbackElement.style.display = 'block';
            const activityContainer = gridElement.closest('.trackable-activity');
            if (activityContainer) {
                activityContainer.classList.add('completed');
                checkStepCompletion(currentStep);
            }
            revealBtn.disabled = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Garante que o DOM está carregado antes de configurar os jogos
    for (let i = 1; i <= 5; i++) { setupDragDropExercise(`dd-exercise-${i}`); }

    // Função para verificar um desafio de código individual
    setupMatchingExercise('matching-exercise-1');
    function checkCodeChallenge(challengeNum) {
        const challengeContainer = document.getElementById(`code-challenge-${challengeNum}`);
        const activityContainer = challengeContainer.closest('.trackable-activity');

        // NOVO: Verifica se o desafio já foi concluído e exibe mensagem.
        if (activityContainer && activityContainer.classList.contains('completed')) {
            const feedbackDiv = challengeContainer.querySelector('.feedback');
            feedbackDiv.textContent = 'Você já respondeu este desafio.';
            feedbackDiv.className = 'feedback incorrect';
            feedbackDiv.style.display = 'block';
            return false;
        }
        // NOVO: Bloqueio definitivo para a etapa 13 se já foi finalizada
        if (localStorage.getItem('finalQuizCompleted') === 'true') return false;

        if (!challengeContainer) return false;

        // Impede que o usuário responda novamente
        const checkBtn = challengeContainer.querySelector('.check-code-btn');
        if (checkBtn && checkBtn.disabled) return false;

        const code = challengeContainer.querySelector('.code-area').value;
        const outputDiv = challengeContainer.querySelector('.exercise-output');
        const feedbackDiv = challengeContainer.querySelector('.feedback');

        let isCorrect = false;
        let expectedOutput = "";
        switch (challengeNum) {
            case 1: // Soma (Etapa 11)
                isCorrect = code.includes('15') && code.includes('30') && code.includes('+');
                expectedOutput = "45";
                break;
            case 2: // Idade (Etapa 11)
                isCorrect = code.includes('idade') && code.includes('>= 18') && code.includes('if') && code.includes('else');
                expectedOutput = "Maior de idade";
                break;
        }

        if (isCorrect) {
            outputDiv.textContent = expectedOutput;
            feedbackDiv.textContent = '✅ Código correto!';
            feedbackDiv.className = 'feedback correct';
            challengeContainer.dataset.correct = "true"; // Marca como correto

            // Adiciona a atividade como concluída e verifica o progresso da etapa
            const activityContainer = challengeContainer.closest('.trackable-activity');
            if (activityContainer && !activityContainer.classList.contains('completed')) {
                activityContainer.classList.add('completed');
                checkStepCompletion(currentStep);

                // Adiciona pontos
                const points = (challengeContainer.dataset.revealed === "true") ? 0 : 10;
                if (window.parent) {
                    window.parent.postMessage({ type: 'ADD_POINTS', points: points }, '*');
                }
            }
        } else {
            outputDiv.textContent = 'Saída incorreta.';
            feedbackDiv.textContent = '❌ Tente novamente. Verifique a lógica do seu código.';
            feedbackDiv.className = 'feedback incorrect';
            challengeContainer.dataset.correct = "false";
        }
        feedbackDiv.style.display = 'block';

        // Desabilita os botões após a verificação
        if (checkBtn) checkBtn.disabled = true;
        const revealBtn = challengeContainer.querySelector('.btn-reveal-solution');
        if (revealBtn) revealBtn.disabled = true;
        return isCorrect;
    }

    // Adiciona listener para os botões de revelar solução de código
    document.querySelectorAll('.btn-reveal-solution').forEach(btn => {
        btn.addEventListener('click', function () {
            const challengeNum = parseInt(this.dataset.challengeId);
            const challengeContainer = document.getElementById(`code-challenge-${challengeNum}`);
            if (!challengeContainer) return;

            // Impede que o usuário revele após já ter respondido
            const checkBtn = challengeContainer.querySelector('.check-code-btn');
            if (checkBtn && checkBtn.disabled) return;

            const codeArea = challengeContainer.querySelector('.code-area');
            const solutions = [
                "a = 15\nb = 30\nprint(a + b)",
                "idade = 25\nif idade >= 18:\n    print('Maior de idade')\nelse:\n    print('Menor de idade')",
            ];
            codeArea.value = solutions[challengeNum - 1];
            
            // Marca como revelado para aplicar a penalidade
            challengeContainer.dataset.revealed = "true";
            
            // Desabilita os botões
            if (checkBtn) checkBtn.disabled = true;
            this.disabled = true;
            checkCodeChallenge(challengeNum); // Valida, marca como completo e exibe a saída

            // Se revelou, a atividade é considerada completa, mas com penalidade.
            const activityContainer = this.closest('.trackable-activity');
            if (activityContainer && !activityContainer.classList.contains('completed')) {
                activityContainer.classList.add('completed');
            }
        });
    });

    /**
     * Desabilita todas as interações no quiz final após o cálculo da pontuação.
     */
    function disableFinalQuizInteractions() {
        const finalQuizContainer = document.getElementById('step-13');
        if (!finalQuizContainer) return;

        // Desabilita todos os botões de revelação e verificação
        finalQuizContainer.querySelectorAll('.btn-reveal-answer, .btn-reveal-solution, .check-code-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Adiciona uma classe para desabilitar o ponteiro do mouse nos quizzes e áreas de código
        finalQuizContainer.querySelectorAll('.quiz-container, .code-playground').forEach(el => {
            el.classList.add('disabled');
        });
    }

    // Adiciona listener para cada botão de verificação de código
    document.querySelectorAll('.check-code-btn').forEach((btn, index) => {

        btn.addEventListener('click', () => checkCodeChallenge(index + 1));
    });

    // NOVO: Verifica no carregamento da página se o quiz final já foi concluído
    if (localStorage.getItem('finalQuizCompleted') === 'true') {
        const finalQuizBtn = document.getElementById('check-final-quiz');
        const finalFeedback = document.getElementById('final-quiz-feedback');

        if (finalQuizBtn) {
            finalQuizBtn.disabled = true;
            finalQuizBtn.textContent = 'Avaliação Finalizada';
        }
        if (finalFeedback) {
            finalFeedback.textContent = 'Você já completou esta avaliação.';
            finalFeedback.className = 'feedback correct';
            finalFeedback.style.display = 'block';
        }
        disableFinalQuizInteractions();
    }

    // NOVO: Exibe o bônus de tempo na Etapa 16, se aplicável
    const timeBonusData = localStorage.getItem('timeBonus');
    if (timeBonusData) {
        const data = JSON.parse(timeBonusData);
        const container = document.getElementById('time-bonus-container');
        if (container) {
            document.getElementById('time-bonus-icon').textContent = data.icon;
            document.getElementById('time-bonus-title').textContent = data.title;
            document.getElementById('completion-time').textContent = data.timeString;
            document.getElementById('bonus-points').textContent = `+${data.points} pontos`;
            container.style.display = 'block';
        }
    }

    // NOVO: Função para calcular e salvar o bônus de tempo
    function calculateAndTimeBonus() {
        if (localStorage.getItem('timeBonus')) return; // Já calculado

        const startTime = parseInt(localStorage.getItem('courseStartTime') || '0');
        if (startTime === 0) return; // Cronômetro nunca iniciou

        const endTime = new Date().getTime();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const minutes = Math.floor(durationSeconds / 60);

        // Salva o tempo total em segundos para ser enviado ao backend
        localStorage.setItem('completionTimeSeconds', durationSeconds);
        const seconds = durationSeconds % 60;

        let bonus = { points: 0, title: '', icon: '', timeString: `${minutes}m ${seconds}s` };

        if (durationSeconds < 1800) { // Menos de 30 minutos
            bonus = { ...bonus, points: 50, title: 'Mestre Python (Ouro)', icon: '🏆' };
        } else if (durationSeconds < 3600) { // Entre 30 e 60 minutos
            bonus = { ...bonus, points: 25, title: 'Aventureiro Ágil (Prata)', icon: '🥈' };
        } else { // Mais de 60 minutos
            bonus = { ...bonus, points: 10, title: 'Explorador Dedicado (Bronze)', icon: '🥉' };
        }

        localStorage.setItem('timeBonus', JSON.stringify(bonus));

        // Adiciona os pontos ao score total e notifica a página pai
        if (window.parent) {
            window.parent.postMessage({ type: 'ADD_POINTS', points: bonus.points }, '*');
        }
    }

    setupWordSearch();

    // Adiciona listener para os botões de revelar resposta do quiz
    document.querySelectorAll('.btn-reveal-answer').forEach(btn => {
        btn.addEventListener('click', function () {
            // NOVO: Bloqueio definitivo para a etapa 13 se já foi finalizada
            if (localStorage.getItem('finalQuizCompleted') === 'true' || this.disabled) return;
            this.disabled = true; // Desabilita para evitar múltiplos cliques
            this.classList.add('revealed');

            const quizContainer = this.closest('.quiz-container');
            if (!quizContainer) return;

            const correctOption = quizContainer.querySelector('.quiz-option[data-correct="true"]');
            const feedback = quizContainer.querySelector('.feedback');

            if (correctOption) correctOption.classList.add('correct');
            feedback.textContent = '💡 A resposta correta foi destacada.';
            feedback.className = 'feedback correct';
            feedback.style.display = 'block';
            quizContainer.classList.add('completed');
            quizContainer.classList.add('answered'); // Marca como respondido
            checkStepCompletion(currentStep);
        });
    });

    // Configurar botões "Desbloquear Próxima Etapa"
    document.querySelectorAll('.btn-unlock-next').forEach(button => {
        button.addEventListener('click', function () {
            const step = parseInt(this.dataset.step);
            const currentUnlockedStep = parseInt(localStorage.getItem('unlockedStep') || '1');

            // Condição para evitar repetição: só executa se a etapa atual ainda não foi desbloqueada.
            // A próxima etapa a ser desbloqueada (step + 1) deve ser maior que a já registrada.
            if ((step + 1) <= currentUnlockedStep) {
                console.log(`A etapa ${step} já foi concluída. Nenhuma ação repetida.`);
                return; // Interrompe a execução para não repetir a ação
            }
            const points = 10;

            // NOVO: Se estiver concluindo a etapa 12 (Desafio Final), calcula o bônus de tempo
            if (step === 12) {
                calculateAndTimeBonus();
            }

            // NOVO: Se for a etapa 1, inicia o cronômetro e avisa a página principal
            if (step === 1) {
                localStorage.setItem('courseStartTime', new Date().getTime());
                window.parent.postMessage({ type: 'START_TIMER' }, '*');
            }

            // Lógica existente para salvar o progresso
            saveAndNotifyProgress(step);
            this.textContent = '✅ Desbloqueado!';
            this.disabled = true; // Desabilita após o clique para evitar múltiplos envios

            // A mensagem 'UPDATE_PROGRESS' já é suficiente e é enviada por saveAndNotifyProgress
            // A página pai agora lida com pontos e atualização do mapa a partir dela.

            // Adicionado: Envia uma mensagem para fechar o modal após um curto atraso
            setTimeout(() => {
                window.parent.postMessage({ type: 'CLOSE_MODAL' }, '*');
            }, 1000); // Atraso de 1 segundo para o usuário ver o feedback "Desbloqueado!"
        });
    });

    // NOVO: Lógica para o botão de finalizar na Etapa 15
    const finalRestartBtn = document.getElementById('restart-course-btn');
    if (finalRestartBtn) {
        finalRestartBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Impede a ação padrão
            this.disabled = true;
            this.textContent = 'Finalizando...';

            // 1. Preenche os resultados na tela
            populateFinalResults();

            // 2. Envia mensagem para parar o cronômetro e fechar o modal
            if (window.parent) {
                // MODIFICADO: Envia uma mensagem mais específica
                window.parent.postMessage({ 
                    type: 'EXTRA_CONTENT_VISITED' 
                }, '*');
            }
        });
    }

    // =========================
    //   CERTIFICADO (PATCH)
    // =========================

    // Garante jsPDF em todos os ambientes
    function ensureJsPDF() {
        if (!window.jspdf) {
            throw new Error("jsPDF não carregado. Inclua, por exemplo: https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
        }
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error("jsPDF não encontrado no objeto window.jspdf.");
        }
        return jsPDF;
    }

    // Fundo com gradiente: usa recurso nativo se existir; senão, fallback via Canvas
    function paintCertificateBackground(doc, isGolden) {
        const hasLinearGradient = !!(doc.internal && typeof doc.internal.createLinearGradient === 'function');

        if (isGolden && hasLinearGradient) {
            // --- Caminho A: tem gradiente nativo do jsPDF (alguns builds locais)
            const grad = doc.internal.createLinearGradient(0, 0, 297, 210, [
                { offset: 0, color: '#FFF8E1' },
                { offset: 1, color: '#FFE082' }
            ]);
            doc.setFillColor(grad);
            doc.rect(0, 0, 297, 210, 'F');
            return;
        }

        if (isGolden && !hasLinearGradient) {
            // --- Caminho B: fallback universal (Canvas -> addImage) — funciona no PythonAnywhere
            const CANVAS_W = 297 * 4;  // resolução maior pra suavizar
            const CANVAS_H = 210 * 4;
            const canvas = document.createElement('canvas');
            canvas.width = CANVAS_W;
            canvas.height = CANVAS_H;
            const ctx = canvas.getContext('2d');

            const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            grad.addColorStop(0, '#FFF8E1');
            grad.addColorStop(1, '#FFE082');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            const dataURL = canvas.toDataURL('image/png');
            doc.addImage(dataURL, 'PNG', 0, 0, 297, 210);
            return;
        }

        // --- Certificado padrão: fundo sólido
        doc.setFillColor('#f0f8ff'); // AliceBlue
        doc.rect(0, 0, 297, 210, 'F');
    }

    // --- Lógica para Geração de Certificado PDF ---
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    if (generatePdfBtn) {
        generatePdfBtn.addEventListener('click', async () => {
            const savedData = localStorage.getItem('studentData');
            const currentScore = parseInt(localStorage.getItem('playerScore') || '0');
            const MAX_POSSIBLE_SCORE = 160; // 16 etapas x 10 pontos

            let studentName = '';
            if (savedData) {
                const studentData = JSON.parse(savedData);
                studentName = studentData.name || '';
            }

            const isGoldenCertificate = currentScore === MAX_POSSIBLE_SCORE;

            if (!studentName.trim()) {
                alert("Não foi possível encontrar seu nome. Por favor, volte para a Etapa 1 e preencha o formulário.");
                return;
            }

            // garante jsPDF e instancia doc
            const jsPDF = ensureJsPDF();
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // pinta o fundo (gradiente nativo ou fallback via Canvas)
            paintCertificateBackground(doc, isGoldenCertificate);

            // Cores
            const primaryColor   = isGoldenCertificate ? '#D4AF37' : '#3776AB';
            const secondaryColor = isGoldenCertificate ? '#FFD700' : '#FFD43B';
            const darkText  = '#212529';
            const lightText = '#6c757d';

            // Bordas decorativas
            doc.setDrawColor(primaryColor);
            doc.setLineWidth(1.5);
            doc.rect(10, 10, 277, 190);
            doc.setDrawColor(secondaryColor);
            doc.setLineWidth(0.5);
            doc.rect(12, 12, 273, 186);

            // utilitário de imagem
            const loadImage = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // ajuda quando servir por CDN
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            // Logo
            const logoPath = (window.STATIC_IMG_PATH || '') + 'logo.png';
            const logoImage = await loadImage(logoPath);
            const logoWidth = 40, logoHeight = 40;
            const logoX = (297 - logoWidth) / 2, logoY = 25;
            doc.addImage(logoImage, 'PNG', logoX, logoY, logoWidth, logoHeight);

            // Título
            doc.setTextColor(primaryColor);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(36);
            const certificateTitle = isGoldenCertificate ? 'Certificado de Excelência (Ouro)' : 'Certificado de Conclusão';
            doc.text(certificateTitle, 148.5, 85, { align: 'center' });

            // “Concedido a”
            doc.setTextColor(darkText);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(18);
            doc.text('Este certificado é concedido a', 148.5, 100, { align: 'center' });

            // Nome
            doc.setTextColor(primaryColor);
            doc.setFont('times', 'bolditalic');
            doc.setFontSize(32);
            doc.text(studentName, 148.5, 115, { align: 'center' });

            // Descrição
            doc.setTextColor(darkText);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(16);
            doc.text('Por ter concluído com sucesso a aula interativa de', 148.5, 135, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text('"Introdução ao Python para Backend"', 148.5, 145, { align: 'center' });

            // Rodapé
            const dateString = new Date().toLocaleDateString('pt-BR');
            doc.setTextColor(lightText);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`Emitido em: ${dateString}`, 148.5, 175, { align: 'center' });
            doc.setFont('helvetica', 'italic');
            doc.text('Este certificado é gerado para fins educacionais e de demonstração. Não possui validade como documento formal.', 148.5, 180, { align: 'center' });

            doc.save(`Certificado-Python-${studentName.replace(/ /g, '_')}.pdf`);

            // Registro local do certificado (mantido como no seu código)
            try {
                let certificateRegistry = JSON.parse(localStorage.getItem('certificateRegistry') || '[]');
                const studentProgress = {
                    studentInfo: JSON.parse(localStorage.getItem('studentData') || '{}'),
                    playerScore: parseInt(localStorage.getItem('playerScore') || '0'),
                    unlockedStep: parseInt(localStorage.getItem('unlockedStep') || '1'),
                    researchNotes: localStorage.getItem('pythonResearchNotes') || '',
                    selectedTheme: localStorage.getItem('theme') || 'light',
                    lastCompletionDate: new Date().toISOString()
                };
                const idx = certificateRegistry.findIndex(e => e.studentInfo.name === studentProgress.studentInfo.name);
                if (idx > -1) certificateRegistry[idx] = studentProgress;
                else certificateRegistry.push(studentProgress);
                localStorage.setItem('certificateRegistry', JSON.stringify(certificateRegistry, null, 2));
            } catch (err) {
                console.error("Erro ao salvar/atualizar o registro do certificado:", err);
            }
        });
    }

    // --- Lógica da Pesquisa de Satisfação (Etapa 16) ---
    const surveyContainer = document.getElementById('satisfaction-survey');
    if (surveyContainer) {
        const starsContainer = surveyContainer.querySelector('.stars');
        const stars = surveyContainer.querySelectorAll('.star');
        const feedbackText = surveyContainer.querySelector('#rating-feedback-text');
        const satisfactionFeedback = surveyContainer.querySelector('#satisfaction-feedback');

        const ratingMessages = {
            0: "Clique para avaliar",
            1: "Ruim 😠",
            2: "Regular 😐",
            3: "Bom 🙂",
            4: "Muito Bom 😄",
            5: "Excelente! 🤩"
        };

        // Função para enviar a avaliação para o backend
        async function sendRatingToBackend(rating) {
            const studentDataRaw = localStorage.getItem('studentData');
            const playerName = studentDataRaw ? JSON.parse(studentDataRaw).name : null;

            try {
                await fetch('/api/survey/submit/', { // Usando a nova URL
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: playerName, rating: rating })
                });
                console.log('Avaliação enviada para o backend com sucesso!');
            } catch (error) {
                console.error('Falha ao enviar avaliação para o backend:', error);
            }
        }

        
        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                const value = parseInt(star.dataset.value);
                // Ilumina as estrelas até a que o mouse está sobre
                stars.forEach(s => {
                    s.classList.toggle('hover', parseInt(s.dataset.value) <= value);
                });
                feedbackText.textContent = ratingMessages[value];
            });

            star.addEventListener('mouseout', () => {
                stars.forEach(s => s.classList.remove('hover'));
                const currentRating = parseInt(starsContainer.dataset.rating);
                feedbackText.textContent = ratingMessages[currentRating];
            });

            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                starsContainer.dataset.rating = value;

                // Marca as estrelas selecionadas
                stars.forEach(s => {
                    s.classList.toggle('selected', parseInt(s.dataset.value) <= value);
                });

                // Salva a avaliação no localStorage
                localStorage.setItem('satisfactionRating', value);

                // Envia a avaliação para o backend
                sendRatingToBackend(value);

                // Marca a atividade como concluída
                if (!surveyContainer.classList.contains('completed')) {
                    surveyContainer.classList.add('completed');
                    checkStepCompletion(currentStep);
                }

                satisfactionFeedback.textContent = '✅ Obrigado pelo seu feedback!';
                satisfactionFeedback.className = 'feedback correct';
                satisfactionFeedback.style.display = 'block';
            });
        });
    }
});
