/**
 * MOODIFY AI - FULL SCRIPT (CLOUD VERSION)
 * Loads a published Teachable Machine image model and plays local mood audio when available.
 */

const URL = "https://teachablemachine.withgoogle.com/models/q6PKC40cH/";
const AUDIO_BASE_PATH = "./audio/";
const MOOD_AUDIO_FILES = {
    Happy: "happy.mp3",
    Sad: "sad.mp3",
    Angry: "angry.mp3",
    Neutral: "neutral.mp3",
    Fear: "fear.mp3",
    Disgust: "disgust.mp3",
    Surprise: "surprise.mp3"
};

let model;
let currentStream;
let facingMode = "user";
let isImageReady = false;
let isModelLoading = false;
let lastSpokenMessage = "";
let lastDetectedMood = "";
let availableVoices = [];
let selectedVoiceName = "";
let currentAudio = null;

function getVoiceStatusText() {
    if (!("speechSynthesis" in window)) {
        return "Add mood audio files in the audio folder. Browser voice is not supported here.";
    }

    if (availableVoices.length === 0) {
        return "Add mood audio files in the audio folder, or use Test Voice for browser speech.";
    }

    return `Voice ready. Add audio files for reliable playback, or use ${availableVoices.length} browser voice${availableVoices.length > 1 ? "s" : ""}.`;
}

function loadVoices() {
    if (!("speechSynthesis" in window)) {
        return;
    }

    availableVoices = window.speechSynthesis.getVoices();
}

function populateVoiceSelect(voiceSelect) {
    if (!voiceSelect) {
        return;
    }

    const previousValue = voiceSelect.value;
    voiceSelect.innerHTML = '<option value="">Default browser voice</option>';

    availableVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
    });

    if (previousValue && availableVoices.some((voice) => voice.name === previousValue)) {
        voiceSelect.value = previousValue;
        selectedVoiceName = previousValue;
    } else if (selectedVoiceName && availableVoices.some((voice) => voice.name === selectedVoiceName)) {
        voiceSelect.value = selectedVoiceName;
    }
}

function chooseVoice() {
    if (selectedVoiceName) {
        const selectedVoice = availableVoices.find((voice) => voice.name === selectedVoiceName);
        if (selectedVoice) {
            return selectedVoice;
        }
    }

    return availableVoices.find((voice) =>
        voice.lang.toLowerCase().startsWith("en") && voice.localService
    ) || availableVoices.find((voice) =>
        voice.lang.toLowerCase().startsWith("en")
    ) || availableVoices[0];
}

function stopCurrentAudio() {
    if (!currentAudio) {
        return;
    }

    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
}

function speakResult(message, voiceStatus) {
    if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis is not supported in this browser.");
        if (voiceStatus) {
            voiceStatus.innerText = "No local audio file found, and browser speech is not supported.";
        }
        return;
    }

    if (!message) {
        alert("There is no result to speak yet.");
        return;
    }

    loadVoices();
    stopCurrentAudio();
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const preferredVoice = chooseVoice();
    if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang || utterance.lang;
    }

    if (voiceStatus) {
        voiceStatus.innerText = preferredVoice
            ? `Speaking with ${preferredVoice.name}...`
            : "Speaking with browser default voice...";
    }

    utterance.onstart = () => {
        if (voiceStatus) {
            voiceStatus.innerText = preferredVoice
                ? `Speaking with ${preferredVoice.name}...`
                : "Speaking now...";
        }
    };

    utterance.onend = () => {
        if (voiceStatus) {
            voiceStatus.innerText = preferredVoice
                ? `Voice played successfully with ${preferredVoice.name}.`
                : "Voice played successfully.";
        }
    };

    utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        if (voiceStatus) {
            voiceStatus.innerText = `Voice playback failed: ${event.error || "unknown error"}. Add local audio files in the audio folder.`;
        }
    };

    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 120);
}

function playMoodAudio(mood, fallbackMessage, voiceStatus) {
    const audioFile = MOOD_AUDIO_FILES[mood];

    if (!audioFile) {
        speakResult(fallbackMessage, voiceStatus);
        return;
    }

    stopCurrentAudio();
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    const audio = new Audio(`${AUDIO_BASE_PATH}${audioFile}`);
    currentAudio = audio;

    audio.onplay = () => {
        if (voiceStatus) {
            voiceStatus.innerText = `Playing ${audioFile}...`;
        }
    };

    audio.onended = () => {
        if (voiceStatus) {
            voiceStatus.innerText = `Audio played successfully: ${audioFile}.`;
        }
        if (currentAudio === audio) {
            currentAudio = null;
        }
    };

    audio.onerror = () => {
        if (voiceStatus) {
            voiceStatus.innerText = `Audio file missing for ${mood}. Falling back to browser voice.`;
        }
        if (currentAudio === audio) {
            currentAudio = null;
        }
        speakResult(fallbackMessage, voiceStatus);
    };

    audio.play().catch(() => {
        if (voiceStatus) {
            voiceStatus.innerText = `Audio playback failed for ${mood}. Falling back to browser voice.`;
        }
        if (currentAudio === audio) {
            currentAudio = null;
        }
        speakResult(fallbackMessage, voiceStatus);
    });
}

async function init() {
    if (isModelLoading || model) {
        return;
    }

    isModelLoading = true;
    console.log("Connecting to Teachable Machine Cloud...");

    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        console.log("AI Model Loaded Successfully from Google!");
    } catch (e) {
        console.error("AI Load Failed. Check if your link is correct and ends with a /", e);
        alert("Model failed to load. Open the browser console to see the exact error.");
    } finally {
        isModelLoading = false;
    }
}

window.addEventListener("load", init);
window.addEventListener("load", loadVoices);

document.addEventListener("DOMContentLoaded", () => {
    const btnCamera = document.getElementById("btn-camera");
    const btnFlip = document.getElementById("btn-flip");
    const btnConfirm = document.getElementById("btn-confirm");
    const btnSpeak = document.getElementById("btn-speak");
    const btnTestVoice = document.getElementById("btn-test-voice");
    const voiceSelect = document.getElementById("voice-select");
    const fileUpload = document.getElementById("file-upload");
    const webcamElement = document.getElementById("webcam");
    const previewImg = document.getElementById("preview-img");
    const scanLine = document.getElementById("scan-line");
    const moodText = document.getElementById("mood-text");
    const resultDisplay = document.getElementById("result-display");
    const voiceStatus = document.getElementById("voice-status");
    const placeholder = document.getElementById("placeholder-text");
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    function updateVoiceStatus() {
        if (voiceStatus) {
            voiceStatus.innerText = getVoiceStatusText();
        }
    }

    updateVoiceStatus();
    loadVoices();
    populateVoiceSelect(voiceSelect);
    updateVoiceStatus();

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
            currentStream = null;
        }
    }

    function resetResult() {
        resultDisplay.classList.add("hidden");
        moodText.innerText = "...";
        moodText.style.color = "";
        scanLine.classList.add("hidden");
        scanLine.classList.remove("scanning");
        lastSpokenMessage = "";
        lastDetectedMood = "";
        stopCurrentAudio();

        if (btnSpeak) {
            btnSpeak.classList.add("hidden");
        }
    }

    async function startWebcam() {
        stopCamera();
        isImageReady = false;
        resetResult();

        try {
            currentStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode }
            });

            webcamElement.srcObject = currentStream;
            webcamElement.classList.remove("hidden");
            previewImg.classList.add("hidden");
            placeholder.classList.add("hidden");
            btnConfirm.classList.remove("hidden");
            btnFlip.classList.remove("hidden");
        } catch (e) {
            console.error("Camera Error:", e);
            alert("Camera access was denied. Please check your browser permissions.");
        }
    }

    btnCamera.addEventListener("click", startWebcam);

    btnFlip.addEventListener("click", () => {
        facingMode = facingMode === "user" ? "environment" : "user";
        startWebcam();
    });

    previewImg.addEventListener("load", () => {
        isImageReady = true;
        btnConfirm.disabled = false;
    });

    previewImg.addEventListener("error", () => {
        isImageReady = false;
        btnConfirm.disabled = true;
        alert("The selected image could not be loaded.");
    });

    fileUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        isImageReady = false;
        btnConfirm.disabled = true;
        resetResult();

        reader.onload = (event) => {
            stopCamera();
            previewImg.src = event.target.result;
            previewImg.classList.remove("hidden");
            webcamElement.classList.add("hidden");
            placeholder.classList.add("hidden");
            btnConfirm.classList.remove("hidden");
            btnFlip.classList.add("hidden");
        };

        reader.readAsDataURL(file);
    });

    btnConfirm.addEventListener("click", async () => {
        if (!model) {
            alert("AI model is still loading. Please wait a moment and try again.");
            return;
        }

        const usingWebcam = !webcamElement.classList.contains("hidden");
        const source = usingWebcam ? webcamElement : previewImg;

        if (!usingWebcam && !isImageReady) {
            alert("Please wait for the uploaded image to finish loading.");
            return;
        }

        scanLine.classList.remove("hidden");
        scanLine.classList.add("scanning");
        resultDisplay.classList.remove("hidden");
        moodText.innerText = "Analyzing Face...";
        moodText.style.color = "";

        try {
            const prediction = await model.predict(source);
            const bestMatch = prediction.reduce((prev, curr) =>
                prev.probability > curr.probability ? prev : curr
            );

            const moodColors = {
                Happy: "#22c55e",
                Angry: "#ef4444",
                Sad: "#3b82f6",
                Neutral: "#8b5cf6",
                Fear: "#3b82f6",
                Disgust: "#15803d",
                Surprise: "#f59e0b"
            };

            setTimeout(() => {
                scanLine.classList.add("hidden");
                scanLine.classList.remove("scanning");
                const score = (bestMatch.probability * 100).toFixed(0);
                moodText.innerText = `${bestMatch.className} (${score}%)`;
                moodText.style.color = moodColors[bestMatch.className] || "#3b82f6";
                lastDetectedMood = bestMatch.className;
                lastSpokenMessage = `Detected mood: ${bestMatch.className}. Confidence ${score} percent.`;

                if (btnSpeak) {
                    btnSpeak.classList.remove("hidden");
                }

                if (voiceStatus) {
                    const audioFile = MOOD_AUDIO_FILES[lastDetectedMood];
                    voiceStatus.innerText = audioFile
                        ? `Ready to play ${audioFile}. Add it inside the audio folder.`
                        : "Result ready. Click Speak Result.";
                }
            }, 1000);
        } catch (error) {
            console.error("Analysis Error:", error);
            scanLine.classList.add("hidden");
            scanLine.classList.remove("scanning");
            moodText.innerText = "Error Scanning";
        }
    });

    if (btnSpeak) {
        btnSpeak.addEventListener("click", () => {
            playMoodAudio(lastDetectedMood, lastSpokenMessage, voiceStatus);
        });
    }

    if (btnTestVoice) {
        btnTestVoice.addEventListener("click", () => {
            loadVoices();
            populateVoiceSelect(voiceSelect);
            updateVoiceStatus();
            speakResult("Voice test successful.", voiceStatus);
        });
    }

    if (voiceSelect) {
        voiceSelect.addEventListener("change", () => {
            selectedVoiceName = voiceSelect.value;
            updateVoiceStatus();
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            document.documentElement.classList.toggle("dark");
            if (themeIcon) {
                themeIcon.innerText = document.documentElement.classList.contains("dark") ? "\u2600\uFE0F" : "\uD83C\uDF19";
            }
        });
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            loadVoices();
            populateVoiceSelect(voiceSelect);
            updateVoiceStatus();
        };
    }
});
