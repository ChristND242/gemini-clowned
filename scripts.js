// Loading screen messages in French
const loadingMessages = [
    "Initialisation de l'interface...",
    "Chargement des ressources...",
    "Préparation de l'IA...",
    "Presque terminé...",
    "Dernières vérifications...",
  ];
  
  // Simulate loading process
  const loadingScreen = document.querySelector(".loading-screen");
  const loadingText = document.querySelector(".loading-text");
  let loadingMessageIndex = 0;
  
  const loadingInterval = setInterval(() => {
    loadingText.textContent = loadingMessages[loadingMessageIndex];
    loadingMessageIndex = (loadingMessageIndex + 1) % loadingMessages.length;
  }, 2000);
  
  // Hide loading screen after 5 seconds
  setTimeout(() => {
    clearInterval(loadingInterval);
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 300);
  }, 5000);
  
  // Main app functionality
  const container = document.querySelector(".container");
  const chatsContainer = document.querySelector(".chats-container");
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = promptForm.querySelector(".prompt-input");
  const fileInput = promptForm.querySelector("#file-input");
  const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
  const themeToggleBtn = document.querySelector("#theme-toggle-btn");
  const settingsBtn = document.querySelector("#settings-btn");
  const settingsModal = document.querySelector(".settings-modal");
  const closeSettingsBtn = document.querySelector(".close-settings");
  const settingsForm = document.querySelector("#settings-form");
  const apiKeyInput = document.querySelector("#api-key");
  
  // API Setup
  let API_KEY = localStorage.getItem("gemini_api_key") || "";
  let API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  let controller, typingInterval;
  let chatHistory = JSON.parse(localStorage.getItem("chat_history")) || [];
  const userData = { message: "", file: {} };
  
  // Load saved chats if they exist
  if (chatHistory.length > 0) {
    document.body.classList.add("chats-active");
    renderSavedChats();
  }
  
  // Set initial theme from local storage
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
  if (isLightTheme) {
    loadingScreen.classList.add("light-theme");
  }
  
  // Load saved API key if it exists
  if (API_KEY) {
    apiKeyInput.value = API_KEY;
  }
  
  // --- HOISTED FUNCTIONS ---
  
  // Create message elements
  function createMessageElement(content, ...classes) {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  }
  
  // Scroll to the bottom of the container
  function scrollToBottom() {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
  
  // Render saved chats from history
  function renderSavedChats() {
    chatsContainer.innerHTML = "";
  
    chatHistory.forEach((message, index) => {
      if (message.role === "user") {
        const userMsgHTML = `
          <p class="message-text">${message.parts[0].text}</p>
          ${
            message.parts[1]
              ? message.parts[1].inline_data.mime_type.startsWith("image/")
                ? `<img src="data:${message.parts[1].inline_data.mime_type};base64,${message.parts[1].inline_data.data}" class="img-attachment" />`
                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${message.parts[1].inline_data.fileName}</p>`
              : ""
          }
        `;
        const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
        userMsgDiv.querySelector(".message-text").textContent =
          message.parts[0].text;
        chatsContainer.appendChild(userMsgDiv);
  
      } else if (message.role === "model" && index > 0) {
        const botMsgHTML = `
          <img class="avatar" src="https://raw.githubusercontent.com/ChristND242/PE-logo/refs/heads/main/png/logo-white.png" />
          <p class="message-text">${message.parts[0].text}</p>
        `;
        const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");
        chatsContainer.appendChild(botMsgDiv);
      }
    });
  
    scrollToBottom();
  }
  
  // --- LOGIC ---
  
  // Simulate typing effect for bot responses
  const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;
  
    typingInterval = setInterval(() => {
      if (wordIndex < words.length) {
        textElement.textContent +=
          (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        scrollToBottom();
      } else {
        clearInterval(typingInterval);
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
        localStorage.setItem("chat_history", JSON.stringify(chatHistory));
      }
    }, 40);
  };
  
  // Make the API call and generate the bot's response
  const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();
  
    chatHistory.push({
      role: "user",
      parts: [
        { text: userData.message },
        ...(userData.file.data
          ? [
              {
                inline_data: (({ fileName, isImage, ...rest }) => rest)(
                  userData.file
                ),
              },
            ]
          : []),
      ],
    });
  
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: chatHistory }),
        signal: controller.signal,
      });
  
      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
  
      const responseText = data.candidates[0].content.parts[0].text
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();
      typingEffect(responseText, textElement, botMsgDiv);
  
      chatHistory.push({ role: "model", parts: [{ text: responseText }] });
      localStorage.setItem("chat_history", JSON.stringify(chatHistory));
  
    } catch (error) {
      textElement.textContent =
        error.name === "AbortError"
          ? "Génération de la réponse arrêtée."
          : "Erreur: " +
            (error.message.includes("API key not valid")
              ? "Clé API invalide. Veuillez vérifier vos paramètres."
              : error.message);
      textElement.style.color = "#d62939";
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      scrollToBottom();
    } finally {
      userData.file = {};
    }
  };
  
  // Handle the form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!API_KEY) {
      alert(
        "Veuillez configurer votre clé API dans les paramètres avant de continuer."
      );
      settingsModal.classList.add("active");
      return;
    }
  
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding"))
      return;
  
    userData.message = userMessage;
    promptInput.value = "";
    document.body.classList.add("chats-active", "bot-responding");
    fileUploadWrapper.classList.remove(
      "file-attached",
      "img-attached",
      "active"
    );
  
    const userMsgHTML = `
      <p class="message-text"></p>
      ${
        userData.file.data
          ? userData.file.isImage
            ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
            : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
          : ""
      }
    `;
    const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userData.message;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();
  
    setTimeout(() => {
      const botMsgHTML = `
        <img class="avatar" src="https://raw.githubusercontent.com/ChristND242/PE-logo/refs/heads/main/png/logo-white.png" />
        <p class="message-text">Un instant...</p>
      `;
      const botMsgDiv = createMessageElement(
        botMsgHTML,
        "bot-message",
        "loading"
      );
      chatsContainer.appendChild(botMsgDiv);
      scrollToBottom();
      generateResponse(botMsgDiv);
    }, 600);
  };
  
  // File upload handling
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      fileInput.value = "";
      const base64String = e.target.result.split(",")[1];
      fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
      fileUploadWrapper.classList.add(
        "active",
        isImage ? "img-attached" : "file-attached"
      );
      userData.file = {
        fileName: file.name,
        data: base64String,
        mime_type: file.type,
        isImage,
      };
    };
  });
  
  // Cancel file upload
  document
    .querySelector("#cancel-file-btn")
    .addEventListener("click", () => {
      userData.file = {};
      fileUploadWrapper.classList.remove(
        "file-attached",
        "img-attached",
        "active"
      );
    });
  
  // Stop Bot Response
  document
    .querySelector("#stop-response-btn")
    .addEventListener("click", () => {
      controller?.abort();
      userData.file = {};
      clearInterval(typingInterval);
      chatsContainer
        .querySelector(".bot-message.loading")
        ?.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    });
  
  // Toggle dark/light theme
  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
    themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
    loadingScreen.classList.toggle("light-theme", isLight);
  });
  
  // Delete all chats
  document
    .querySelector("#delete-chats-btn")
    .addEventListener("click", () => {
      if (
        confirm(
          "Êtes-vous sûr de vouloir supprimer toute l'historique de conversation ?"
        )
      ) {
        chatHistory.length = 0;
        chatsContainer.innerHTML = "";
        localStorage.removeItem("chat_history");
        document.body.classList.remove("chats-active", "bot-responding");
      }
    });
  
  // Suggestions click
  document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
      promptInput.value = suggestion.querySelector(".text").textContent;
      promptForm.dispatchEvent(new Event("submit"));
    });
  });
  
  // Mobile controls toggle
  document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide =
      target.classList.contains("prompt-input") ||
      (wrapper.classList.contains("hide-controls") &&
        (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
  });
  
  // Settings modal
  settingsBtn.addEventListener("click", () => settingsModal.classList.add("active"));
  closeSettingsBtn.addEventListener("click", () =>
    settingsModal.classList.remove("active")
  );
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("active");
  });
  
  // Save settings
  settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newApiKey = apiKeyInput.value.trim();
    if (newApiKey) {
      API_KEY = newApiKey;
      API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
      localStorage.setItem("gemini_api_key", API_KEY);
      alert("Paramètres enregistrés avec succès !");
      settingsModal.classList.remove("active");
    } else {
      alert("Veuillez entrer une clé API valide.");
    }
  });
  
  // Wire up form & file buttons
  promptForm.addEventListener("submit", handleFormSubmit);
  promptForm
    .querySelector("#add-file-btn")
    .addEventListener("click", () => fileInput.click());
  