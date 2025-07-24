  const video = document.getElementById("webcam");
  const captureBtn = document.getElementById("capture");
  const retakeBtn = document.getElementById("retake");
  const capturedImage = document.getElementById("capturedImage");
  const extractedText = document.getElementById("extractedText");
  const searchText = document.getElementById("searchText");
  const searchBtn = document.getElementById("search");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const copyClipboardBtn = document.getElementById("copyClipboard");
  const toggleCameraBtn = document.getElementById("toggleCamera");
  const aiSummaryBtn = document.getElementById("aiSummaryBtn");
  const aiSummarySection = document.getElementById("aiSummarySection");
  const aiSummaryContent = document.getElementById("aiSummaryContent");
  const modelInfo = document.getElementById("modelInfo");
  const modelName = document.getElementById("modelName");

  let mediaStream = null;
  const API_URL = "http://localhost:3000";

  // Initialize
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && captureBtn.style.display !== "none") {
      captureBtn.click();
    }
  });

  // Camera initialization
  async function initializeCamera() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = mediaStream;
      captureBtn.disabled = false;
      toggleCameraBtn.textContent = "📷";
    } catch (err) {
      alert("Please allow camera access");
      toggleCameraBtn.disabled = true;
    }
  }

  // Capture image
  captureBtn.addEventListener("click", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/png");
    capturedImage.src = imageData;
    video.style.display = "none";
    capturedImage.style.display = "block";

    try {
      extractedText.textContent = "Processing image...";
      const response = await fetch(`/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData.split(",")[1] }),
      });

      const data = await response.json();
      extractedText.textContent = data.text || "No text found";
    } catch (error) {
      extractedText.textContent = "Error processing image";
    }

    captureBtn.style.display = "none";
    retakeBtn.style.display = "inline-block";
  });

  // Retake photo
  retakeBtn.addEventListener("click", () => {
    initializeCamera();
    capturedImage.style.display = "none";
    video.style.display = "block";
    captureBtn.style.display = "inline-block";
    retakeBtn.style.display = "none";
    extractedText.textContent = "Your text will appear here...";
    searchText.value = "";
    aiSummarySection.style.display = "none";
  });

  // Camera toggle
  toggleCameraBtn.addEventListener("click", () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      video.style.display = "none";
      capturedImage.style.display = "none";
      toggleCameraBtn.textContent = "📷";
      captureBtn.disabled = true;
    } else {
      initializeCamera();
    }
  });

  // Copy to clipboard
  copyClipboardBtn.addEventListener("click", () => {
    const textToCopy = extractedText.textContent;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Show copy feedback
        const feedback = document.createElement("div");
        feedback.innerHTML = '<i class="fas fa-check"></i> Text copied!';
        feedback.style.position = "fixed";
        feedback.style.bottom = "20px";
        feedback.style.left = "50%";
        feedback.style.transform = "translateX(-50%)";
        feedback.style.padding = "10px 15px";
        feedback.style.backgroundColor = "#2ecc71";
        feedback.style.color = "white";
        feedback.style.borderRadius = "8px";
        feedback.style.zIndex = "1000";
        feedback.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
        feedback.style.animation = "fadeIn 0.3s ease";
        document.body.appendChild(feedback);

        setTimeout(() => {
          feedback.style.animation = "fadeOut 0.5s ease forwards";
          setTimeout(() => {
            document.body.removeChild(feedback);
          }, 500);
        }, 1500);
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
      });
  });

  // Search functionality
  searchBtn.addEventListener("click", () => {
    const query = searchText.value.trim();
    if (query)
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        "_blank"
      );
  });

  // Text selection
  extractedText.addEventListener("mouseup", () => {
    const selection = window.getSelection().toString().trim();
    if (selection) searchText.value = selection;
  });

  // Dark mode toggle
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode")
    );
    darkModeToggle.textContent = document.body.classList.contains("dark-mode")
      ? "☀️"
      : "🌙";
  });

  // Initialize dark mode
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    darkModeToggle.textContent = "☀️";
  }

  // AI Summary functionality - Always uses "fast" model
  aiSummaryBtn.addEventListener("click", async () => {
    const textToSummarize = searchText.value.trim() || extractedText.textContent;

    if (!textToSummarize || textToSummarize === "Your text will appear here...") {
      alert("Please capture text first or select text to summarize");
      return;
    }

    // Show loading state
    aiSummarySection.style.display = "block";
    aiSummaryContent.innerHTML =
      '<div class="loading-spinner"></div> Generating summary...';
    modelInfo.classList.remove("visible");

    // Scroll to summary section
    aiSummarySection.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const response = await fetch(`/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSummarize,
          modelType: "fast", // Always use fast model
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update model info
        modelName.textContent = "fast";
        modelInfo.classList.add("visible");

        // Convert Markdown to HTML
        const html = marked.parse(data.summary);
        aiSummaryContent.innerHTML = html;
      } else {
        aiSummaryContent.innerHTML = `Error: ${
          data.error || "Failed to generate summary"
        }`;
      }
    } catch (error) {
      console.error("AI Summary Error:", error);
      aiSummaryContent.innerHTML = "Error: Failed to connect to the server.";
    }
  });

  initializeCamera();