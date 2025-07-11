document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Element References ---
  const fileUpload = document.getElementById("file-upload");
  const fileCountSpan = document.getElementById("file-count");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const photoGallery = document.getElementById("photo-gallery");
  const spinnerContainer = document.getElementById("spinner-container");
  const bwToggle = document.getElementById("bw-toggle");

  let processedImages = []; // To store data URLs for zipping

  // --- Event Listeners ---
  fileUpload.addEventListener("change", handleFileSelect);
  downloadAllBtn.addEventListener("click", downloadAllAsZip);

  /**
   * Handles the file selection event.
   */
  function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    photoGallery.innerHTML = "";
    processedImages = [];
    downloadAllBtn.disabled = true;
    fileCountSpan.textContent = `${files.length} file${
      files.length > 1 ? "s" : ""
    } selected`;
    showSpinner();

    const processingPromises = Array.from(files).map((file) =>
      processImage(file)
    );

    Promise.all(processingPromises)
      .then(() => {
        hideSpinner();
        if (processedImages.length > 0) {
          downloadAllBtn.disabled = false;
        }
      })
      .catch((error) => {
        console.error("An error occurred during image processing:", error);
        hideSpinner();
        // Use a custom modal or a less intrusive notification in a real app
        // For this example, alert is used for simplicity.
        // alert("Sorry, an error occurred while processing your images.");
      });
  }

  /**
   * Resizes an image with high quality using an offscreen canvas.
   * @param {HTMLImageElement} img - The image to resize.
   * @param {number} width - The target width.
   * @param {number} height - The target height.
   * @returns {HTMLCanvasElement} - The resized canvas.
   */
  function resizeImageHighQuality(img, width, height) {
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d");

    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    // Use a two-step resizing process for better quality
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    tempCanvas.width = img.width / 2;
    tempCanvas.height = img.height / 2;
    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

    offscreenCtx.drawImage(
      tempCanvas,
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
      0,
      0,
      width,
      height
    );

    return offscreenCanvas;
  }

  /**
   * Processes a single image file with enhanced retro effects.
   * @param {File} file - The image file to process.
   * @returns {Promise<void>}
   */
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = resizeImageHighQuality(img, img.width, img.height);
          const ctx = canvas.getContext("2d");

          // Apply effects after resizing
          if (bwToggle.checked) {
            ctx.filter = "grayscale(100%)";
          } else {
            ctx.filter =
              "sepia(0.3) contrast(1.5) brightness(0.9) saturate(1.2) hue-rotate(-5deg)";
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          if (!bwToggle.checked) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = "#f7edd5ff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
          }

          const vignetteAmount = 0.8;
          const gradient = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 3,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 2 + canvas.width * vignetteAmount
          );
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(1, "rgba(0,0,0,0.5)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          addNoise(ctx, canvas.width, canvas.height);
          addScratches(ctx, canvas.width, canvas.height);
          addLightLeak(ctx, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL("image/png");
          const originalFileName = file.name.split(".").slice(0, -1).join(".");
          const newFileName = `instant-film-${originalFileName}.png`;

          processedImages.push({ name: newFileName, dataUrl: dataUrl });
          createPolaroidElement(dataUrl, newFileName);
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Adds random noise/grain to the canvas. */
  function addNoise(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45; // Increased noise intensity
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /** Adds more prominent random scratches to the canvas. */
  function addScratches(ctx, width, height) {
    // Add more scratches, both white and black, and make them thicker
    for (let i = 0; i < 15; i++) {
      ctx.strokeStyle =
        Math.random() > 0.5
          ? "rgba(255, 255, 255, 0.25)"
          : "rgba(0, 0, 0, 0.2)";
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const endX = startX + (Math.random() - 0.5) * (width * 0.2);
      const endY = startY + (Math.random() - 0.5) * (height * 0.2);
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /** Adds a subtle, random light leak effect. */
  function addLightLeak(ctx, width, height) {
    const leakColor =
      Math.random() > 0.5
        ? "rgba(255, 50, 50, 0.15)"
        : "rgba(255, 200, 50, 0.15)";
    const x = Math.random() * width - width * 0.2;
    const y = Math.random() * height - height * 0.2;
    const size = Math.random() * Math.max(width, height) * 0.8 + 200;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, leakColor);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Creates the HTML structure for a single processed photo.
   */
  function createPolaroidElement(dataUrl, fileName) {
    const frame = document.createElement("div");
    frame.className = "polaroid-frame";

    const removeButton = document.createElement("div");
    removeButton.className = "remove-btn";
    removeButton.innerHTML = "&times;";
    removeButton.onclick = (event) => {
      event.stopPropagation();
      // 1. Remove from data array
      processedImages = processedImages.filter((img) => img.name !== fileName);
      // 2. Remove from DOM
      frame.remove();
      // 3. Update UI
      fileCountSpan.textContent = `${processedImages.length} file${
        processedImages.length !== 1 ? "s" : ""
      } selected`;
      if (processedImages.length === 0) {
        downloadAllBtn.disabled = true;
      }
    };

    const photoContainer = document.createElement("div");
    photoContainer.className = "photo-container";

    const imgElement = document.createElement("img");
    imgElement.src = dataUrl;
    imgElement.onload = () => {
      imgElement.style.opacity = "1";
    };

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.textContent = "";

    const downloadButton = document.createElement("button");
    downloadButton.className = "download-btn-single";
    downloadButton.textContent = "Download";
    downloadButton.onclick = (event) => {
      event.stopPropagation(); // Prevent any parent clicks
      downloadSingleImage(dataUrl, fileName);
    };

    frame.appendChild(removeButton);
    photoContainer.appendChild(imgElement);
    frame.appendChild(photoContainer);
    frame.appendChild(caption);
    frame.appendChild(downloadButton);
    photoGallery.appendChild(frame);
  }

  /**
   * Triggers the download of a single image.
   */
  function downloadSingleImage(dataUrl, fileName) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Compiles all processed images into a zip file and triggers the download.
   */
  function downloadAllAsZip() {
    if (processedImages.length === 0) return;
    showSpinner();
    const zip = new JSZip();

    processedImages.forEach((img) => {
      const base64Data = img.dataUrl.split(",")[1];
      zip.file(img.name, base64Data, { base64: true });
    });

    zip
      .generateAsync({ type: "blob" })
      .then((content) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "instant-film-photos.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        hideSpinner();
      })
      .catch((error) => {
        console.error("Error creating zip file:", error);
        hideSpinner();
        // alert("Sorry, there was an error creating the zip file.");
      });
  }

  function showSpinner() {
    spinnerContainer.style.display = "flex";
  }
  function hideSpinner() {
    spinnerContainer.style.display = "none";
  }
});
