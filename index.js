        // Global Variables
        let pdfFiles = [];
        let stamps = [];
        let currentFileIndex = 0;
        let currentPage = 1;
        let pdfDoc = null;
        let fabricCanvas = null;
        let processedFiles = [];
        let isDrawing = false;
        let signatureCanvas = null;
        let signatureCtx = null;
        let selectedTemplate = null;

        // Predefined templates
        const templates = [
            {
                id: 'bss-terkendali',
                name: 'BSS Terkendali',
                description: 'Template dengan logo BSS',
                defaultHeader: 'BSS TERKENDALI',
                defaultLabel: 'NO. SALINAN :',
                defaultNumber: '1',
                headerColor: '#FF0000',
                textColor: '#000000',
                hasLogo: true,
                logoText: 'BSS'
            },
            {
                id: 'salinan-standar',
                name: 'Salinan Standar',
                description: 'Template salinan standar',
                defaultHeader: 'SALINAN',
                defaultLabel: 'NO. SALINAN :',
                defaultNumber: '1',
                headerColor: '#0000FF',
                textColor: '#000000',
                hasLogo: false
            },
            {
                id: 'terkendali-simple',
                name: 'Terkendali Simple',
                description: 'Template terkendali sederhana',
                defaultHeader: 'TERKENDALI',
                defaultLabel: 'NO. DOKUMEN :',
                defaultNumber: '001',
                headerColor: '#FF6600',
                textColor: '#000000',
                hasLogo: false
            },
            {
                id: 'copy-controlled',
                name: 'Copy Controlled',
                description: 'English controlled copy',
                defaultHeader: 'CONTROLLED COPY',
                defaultLabel: 'COPY NO. :',
                defaultNumber: '1',
                headerColor: '#CC0000',
                textColor: '#000000',
                hasLogo: false
            }
        ];

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            setupEventListeners();
            loadStampsFromStorage();
            updateStampList();
            loadTemplateGallery();
        });

        function setupEventListeners() {
            // Tab switching
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    switchTab(this.dataset.tab);
                });
            });

            // File upload
            const fileInput = document.getElementById('file-input');
            const uploadArea = document.getElementById('upload-area');

            fileInput.addEventListener('change', handleFileSelect);
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            });

            // Clear files
            document.getElementById('clear-files').addEventListener('click', clearAllFiles);

            // Stamp management
            document.getElementById('add-signature').addEventListener('click', openSignatureModal);
            document.getElementById('add-image').addEventListener('click', () => {
                document.getElementById('stamp-image-input').click();
            });
            document.getElementById('stamp-image-input').addEventListener('change', handleImageUpload);

            // Signature modal
            document.getElementById('clear-signature').addEventListener('click', clearSignature);
            document.getElementById('save-signature').addEventListener('click', saveSignature);

            // Template generator
            document.getElementById('preview-template').addEventListener('click', previewTemplate);
            document.getElementById('generate-template').addEventListener('click', generateAndSaveTemplate);
            document.getElementById('template-upload').addEventListener('change', handleTemplateUpload);

            // Preview controls
            document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
            document.getElementById('next-page').addEventListener('click', () => changePage(1));
            document.getElementById('file-selector').addEventListener('change', changeFile);
            document.getElementById('add-stamp-to-canvas').addEventListener('click', addStampToCanvas);
            document.getElementById('apply-position').addEventListener('click', applyPresetPosition);
            document.getElementById('apply-stamp').addEventListener('click', applyStampToAllFiles);
            document.getElementById('clear-canvas').addEventListener('click', clearCanvas);
            document.getElementById('remove-selected').addEventListener('click', removeSelectedStamp);
            document.getElementById('fix-canvas-layer').addEventListener('click', fixCanvasLayer);
            document.getElementById('opacity-slider').addEventListener('input', updateOpacity);
            document.getElementById('size-slider').addEventListener('input', updateSize);

            // Download
            document.getElementById('download-all').addEventListener('click', downloadAllAsZip);
            document.getElementById('download-selected').addEventListener('click', downloadSelected);
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            if (tabName === 'preview') {
                initializePreview();
            } else if (tabName === 'download') {
                updateDownloadList();
            }
        }

        function handleFileSelect(e) {
            const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            
            if (files.length === 0) {
                alert('Please select PDF files only');
                return;
            }

            files.forEach(file => {
                pdfFiles.push({
                    file: file,
                    name: file.name,
                    loaded: false,
                    processed: false
                });
            });

            updateFileList();
            document.getElementById('file-input').value = '';
        }

        function updateFileList() {
            const fileList = document.getElementById('file-list');
            const fileCount = document.getElementById('file-count');
            const container = document.getElementById('file-list-container');

            if (pdfFiles.length === 0) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            fileCount.textContent = pdfFiles.length;
            fileList.innerHTML = '';

            pdfFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <input type="checkbox" checked data-index="${index}">
                    <span class="file-name">${file.name}</span>
                    <span class="file-status">${file.processed ? '✅ Processed' : '⏳ Pending'}</span>
                    <button class="btn btn-danger" onclick="removeFile(${index})" style="padding: 5px 10px;">Remove</button>
                `;
                fileList.appendChild(item);
            });
        }

        function removeFile(index) {
            pdfFiles.splice(index, 1);
            updateFileList();
        }

        function clearAllFiles() {
            if (confirm('Are you sure you want to clear all files?')) {
                pdfFiles = [];
                processedFiles = [];
                updateFileList();
            }
        }

        function openSignatureModal() {
            const modal = document.getElementById('signature-modal');
            modal.classList.add('show');
            
            if (!signatureCanvas) {
                signatureCanvas = document.getElementById('signature-canvas');
                signatureCtx = signatureCanvas.getContext('2d');
                
                signatureCanvas.addEventListener('mousedown', startDrawing);
                signatureCanvas.addEventListener('mousemove', draw);
                signatureCanvas.addEventListener('mouseup', stopDrawing);
                signatureCanvas.addEventListener('mouseout', stopDrawing);
            }
        }

        function closeSignatureModal() {
            document.getElementById('signature-modal').classList.remove('show');
        }

        function startDrawing(e) {
            isDrawing = true;
            const rect = signatureCanvas.getBoundingClientRect();
            signatureCtx.beginPath();
            signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        }

        function draw(e) {
            if (!isDrawing) return;
            const rect = signatureCanvas.getBoundingClientRect();
            const color = document.getElementById('sig-color').value;
            signatureCtx.strokeStyle = color;
            signatureCtx.lineWidth = 2;
            signatureCtx.lineCap = 'round';
            signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            signatureCtx.stroke();
        }

        function stopDrawing() {
            isDrawing = false;
        }

        function clearSignature() {
            signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        }

        function saveSignature() {
            const dataUrl = signatureCanvas.toDataURL();
            stamps.push({
                id: Date.now(),
                type: 'signature',
                data: dataUrl
            });
            saveStampsToStorage();
            updateStampList();
            closeSignatureModal();
            clearSignature();
        }

        function handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                stamps.push({
                    id: Date.now(),
                    type: 'image',
                    data: event.target.result
                });
                saveStampsToStorage();
                updateStampList();
            };
            reader.readAsDataURL(file);
        }

        function updateStampList() {
            const stampList = document.getElementById('stamp-list');
            const stampSelector = document.getElementById('stamp-selector');
            
            if (stamps.length === 0) {
                stampList.innerHTML = '<p style="color: #666;">No stamps added yet. Create a stamp using the buttons above.</p>';
                stampSelector.innerHTML = '<option value="">-- No Stamp Selected --</option>';
                return;
            }

            stampList.innerHTML = '';
            stampSelector.innerHTML = '<option value="">-- Select a Stamp --</option>';

            stamps.forEach((stamp, index) => {
                const item = document.createElement('div');
                item.className = 'stamp-item';
                item.innerHTML = `
                    <img src="${stamp.data}" alt="Stamp ${index + 1}">
                    <button class="remove-stamp" onclick="removeStamp(${index})">×</button>
                `;
                stampList.appendChild(item);

                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${stamp.type === 'signature' ? '✏️' : '🖼️'} Stamp ${index + 1}`;
                stampSelector.appendChild(option);
            });
        }

        function removeStamp(index) {
            if (confirm('Remove this stamp?')) {
                stamps.splice(index, 1);
                saveStampsToStorage();
                updateStampList();
            }
        }

        function saveStampsToStorage() {
            localStorage.setItem('pdf-stamps-multi', JSON.stringify(stamps));
        }

        function loadStampsFromStorage() {
            const saved = localStorage.getItem('pdf-stamps-multi');
            if (saved) {
                try {
                    stamps = JSON.parse(saved);
                } catch (e) {
                    stamps = [];
                }
            }
        }

        async function initializePreview() {
            if (pdfFiles.length === 0) {
                document.getElementById('no-files-message').style.display = 'block';
                document.getElementById('preview-container').style.display = 'none';
                return;
            }

            document.getElementById('no-files-message').style.display = 'none';
            document.getElementById('preview-container').style.display = 'block';

            const fileSelector = document.getElementById('file-selector');
            fileSelector.innerHTML = '';
            pdfFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = file.name;
                fileSelector.appendChild(option);
            });

            currentFileIndex = 0;
            await loadPDFForPreview(0);
        }

        async function loadPDFForPreview(fileIndex) {
            if (!pdfFiles[fileIndex]) return;

            const file = pdfFiles[fileIndex].file;
            const arrayBuffer = await file.arrayBuffer();
            
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            document.getElementById('total-pages').textContent = pdfDoc.numPages;
            
            currentPage = 1;
            await renderPage();
            initializeFabricCanvas();
        }

        async function renderPage() {
            if (!pdfDoc) return;

            const page = await pdfDoc.getPage(currentPage);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            document.getElementById('current-page').textContent = currentPage;

            if (fabricCanvas) {
                fabricCanvas.setDimensions({ 
                    width: viewport.width, 
                    height: viewport.height 
                });
                
                // Ensure fabric canvas stays on top after render
                const fabricCanvasEl = document.getElementById('fabric-canvas');
                if (fabricCanvasEl) {
                    fabricCanvasEl.style.position = 'absolute';
                    fabricCanvasEl.style.top = '0';
                    fabricCanvasEl.style.left = '0';
                    fabricCanvasEl.style.zIndex = '10';
                    fabricCanvasEl.style.pointerEvents = 'auto';
                }
                
                // Also update wrapper
                const canvasWrapper = fabricCanvas.wrapperEl;
                if (canvasWrapper) {
                    canvasWrapper.style.position = 'absolute';
                    canvasWrapper.style.top = '0';
                    canvasWrapper.style.left = '0';
                    canvasWrapper.style.zIndex = '10';
                }
                
                fabricCanvas.renderAll();
            }
        }

        function initializeFabricCanvas() {
            const pdfCanvas = document.getElementById('pdf-canvas');
            
            if (fabricCanvas) {
                fabricCanvas.dispose();
            }

            const fabricCanvasEl = document.getElementById('fabric-canvas');
            fabricCanvasEl.width = pdfCanvas.width;
            fabricCanvasEl.height = pdfCanvas.height;
            fabricCanvasEl.style.position = 'absolute';
            fabricCanvasEl.style.top = '0';
            fabricCanvasEl.style.left = '0';
            fabricCanvasEl.style.zIndex = '10';
            fabricCanvasEl.style.pointerEvents = 'auto';

            fabricCanvas = new fabric.Canvas('fabric-canvas', {
                isDrawingMode: false,
                selection: true,
                width: pdfCanvas.width,
                height: pdfCanvas.height,
                backgroundColor: 'transparent',
                renderOnAddRemove: true,
                skipTargetFind: false,
                preserveObjectStacking: true
            });

            // Ensure fabric canvas wrapper has correct z-index
            const canvasWrapper = fabricCanvas.wrapperEl;
            if (canvasWrapper) {
                canvasWrapper.style.position = 'absolute';
                canvasWrapper.style.zIndex = '10';
            }

            // Update opacity and size when object is selected
            fabricCanvas.on('selection:created', updateControlsFromObject);
            fabricCanvas.on('selection:updated', updateControlsFromObject);
            fabricCanvas.on('object:modified', function() {
                fabricCanvas.renderAll();
            });
        }

        function updateControlsFromObject(e) {
            const obj = e.selected[0];
            if (obj) {
                const opacity = Math.round(obj.opacity * 100);
                document.getElementById('opacity-slider').value = opacity;
                document.getElementById('opacity-value').textContent = opacity + '%';
                
                const size = Math.round(obj.getScaledWidth());
                document.getElementById('size-slider').value = size;
                document.getElementById('size-value').textContent = size + 'px';
            }
        }

        function addStampToCanvas() {
            const stampIndex = document.getElementById('stamp-selector').value;
            if (!stampIndex) {
                alert('Please select a stamp first');
                return;
            }

            const stamp = stamps[parseInt(stampIndex)];
            
            fabric.Image.fromURL(stamp.data, function(img) {
                img.scaleToWidth(150);
                img.set({
                    left: fabricCanvas.width / 2 - 75,
                    top: fabricCanvas.height / 2 - 75,
                    opacity: document.getElementById('opacity-slider').value / 100,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockUniScaling: false
                });
                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
                fabricCanvas.bringToFront(img);
                fabricCanvas.renderAll();
                
                // Force canvas wrapper to stay on top
                setTimeout(() => {
                    const canvasWrapper = fabricCanvas.wrapperEl;
                    if (canvasWrapper) {
                        canvasWrapper.style.zIndex = '10';
                    }
                    const upperCanvas = fabricCanvas.upperCanvasEl;
                    if (upperCanvas) {
                        upperCanvas.style.zIndex = '11';
                        upperCanvas.style.pointerEvents = 'auto';
                    }
                }, 100);
            });
        }

        function applyPresetPosition() {
            const activeObject = fabricCanvas.getActiveObject();
            if (!activeObject) {
                alert('Please select a stamp on the canvas first');
                return;
            }

            const position = document.getElementById('position-preset').value;
            const canvasWidth = fabricCanvas.width;
            const canvasHeight = fabricCanvas.height;
            const objWidth = activeObject.getScaledWidth();
            const objHeight = activeObject.getScaledHeight();
            const padding = 50;

            let left, top;

            switch(position) {
                case 'top-left':
                    left = padding;
                    top = padding;
                    break;
                case 'top-center':
                    left = (canvasWidth - objWidth) / 2;
                    top = padding;
                    break;
                case 'top-right':
                    left = canvasWidth - objWidth - padding;
                    top = padding;
                    break;
                case 'center':
                    left = (canvasWidth - objWidth) / 2;
                    top = (canvasHeight - objHeight) / 2;
                    break;
                case 'bottom-left':
                    left = padding;
                    top = canvasHeight - objHeight - padding;
                    break;
                case 'bottom-center':
                    left = (canvasWidth - objWidth) / 2;
                    top = canvasHeight - objHeight - padding;
                    break;
                case 'bottom-right':
                    left = canvasWidth - objWidth - padding;
                    top = canvasHeight - objHeight - padding;
                    break;
                default:
                    return;
            }

            activeObject.set({ left, top });
            fabricCanvas.renderAll();
        }

        function changePage(delta) {
            if (!pdfDoc) return;
            
            const newPage = currentPage + delta;
            if (newPage >= 1 && newPage <= pdfDoc.numPages) {
                currentPage = newPage;
                renderPage();
            }
        }

        function changeFile() {
            const fileIndex = parseInt(document.getElementById('file-selector').value);
            currentFileIndex = fileIndex;
            loadPDFForPreview(fileIndex);
        }

        function clearCanvas() {
            if (fabricCanvas) {
                fabricCanvas.clear();
            }
        }

        function removeSelectedStamp() {
            if (fabricCanvas) {
                const activeObject = fabricCanvas.getActiveObject();
                if (activeObject) {
                    fabricCanvas.remove(activeObject);
                    fabricCanvas.renderAll();
                } else {
                    alert('Please select a stamp on the canvas first');
                }
            }
        }

        function updateOpacity() {
            const value = document.getElementById('opacity-slider').value;
            document.getElementById('opacity-value').textContent = value + '%';
            
            if (fabricCanvas) {
                const activeObject = fabricCanvas.getActiveObject();
                if (activeObject) {
                    activeObject.set('opacity', value / 100);
                    fabricCanvas.renderAll();
                }
            }
        }

        function updateSize() {
            const value = document.getElementById('size-slider').value;
            document.getElementById('size-value').textContent = value + 'px';
            
            if (fabricCanvas) {
                const activeObject = fabricCanvas.getActiveObject();
                if (activeObject) {
                    activeObject.scaleToWidth(parseInt(value));
                    fabricCanvas.renderAll();
                }
            }
        }

        function fixCanvasLayer() {
            if (!fabricCanvas) {
                alert('Canvas not initialized yet');
                return;
            }

            // Force fix all z-index issues
            const pdfCanvas = document.getElementById('pdf-canvas');
            const fabricCanvasEl = document.getElementById('fabric-canvas');
            const container = document.getElementById('canvas-container');

            // PDF canvas at bottom
            pdfCanvas.style.position = 'relative';
            pdfCanvas.style.zIndex = '1';

            // Fabric canvas on top
            fabricCanvasEl.style.position = 'absolute';
            fabricCanvasEl.style.top = '0';
            fabricCanvasEl.style.left = '0';
            fabricCanvasEl.style.zIndex = '10';
            fabricCanvasEl.style.pointerEvents = 'auto';

            // Fix fabric wrapper
            const canvasWrapper = fabricCanvas.wrapperEl;
            if (canvasWrapper) {
                canvasWrapper.style.position = 'absolute';
                canvasWrapper.style.top = '0';
                canvasWrapper.style.left = '0';
                canvasWrapper.style.zIndex = '10';
            }

            // Fix upper canvas (where selection happens)
            const upperCanvas = fabricCanvas.upperCanvasEl;
            if (upperCanvas) {
                upperCanvas.style.zIndex = '11';
                upperCanvas.style.pointerEvents = 'auto';
            }

            // Fix lower canvas
            const lowerCanvas = fabricCanvas.lowerCanvasEl;
            if (lowerCanvas) {
                lowerCanvas.style.zIndex = '10';
            }

            fabricCanvas.renderAll();

            // Show debug info
            const debugEl = document.getElementById('canvas-debug');
            debugEl.style.display = 'block';
            debugEl.innerHTML = `
                <strong>✅ Layer fixed!</strong><br>
                PDF Canvas z-index: ${pdfCanvas.style.zIndex}<br>
                Fabric Canvas z-index: ${fabricCanvasEl.style.zIndex}<br>
                Wrapper z-index: ${canvasWrapper ? canvasWrapper.style.zIndex : 'N/A'}<br>
                Upper Canvas z-index: ${upperCanvas ? upperCanvas.style.zIndex : 'N/A'}<br>
                Objects on canvas: ${fabricCanvas.getObjects().length}
            `;

            setTimeout(() => {
                debugEl.style.display = 'none';
            }, 3000);
        }

        async function applyStampToAllFiles() {
            // Check if there are stamps on the canvas
            if (!fabricCanvas || fabricCanvas.getObjects().length === 0) {
                alert('Please add at least one stamp to the canvas first');
                return;
            }

            if (!confirm(`Apply stamp(s) to all ${pdfFiles.length} files?`)) {
                return;
            }

            const repeatInterval = parseInt(document.getElementById('repeat-interval').value) || 0;

            // Get stamp configurations from fabric canvas
            const stampConfigs = fabricCanvas.getObjects().map(obj => {
                return {
                    imageData: obj.toDataURL(),
                    left: obj.left,
                    top: obj.top,
                    width: obj.getScaledWidth(),
                    height: obj.getScaledHeight(),
                    opacity: obj.opacity,
                    scaleX: obj.scaleX,
                    scaleY: obj.scaleY
                };
            });

            // Show progress
            switchTab('download');
            const progressContainer = document.getElementById('progress-container');
            progressContainer.style.display = 'block';

            processedFiles = [];

            for (let i = 0; i < pdfFiles.length; i++) {
                const progress = ((i + 1) / pdfFiles.length * 100).toFixed(0);
                document.getElementById('progress-fill').style.width = progress + '%';
                document.getElementById('progress-fill').textContent = progress + '%';
                document.getElementById('progress-text').textContent = `Processing ${pdfFiles[i].name} (${i + 1}/${pdfFiles.length})`;

                const processedPdf = await processFileWithStamp(pdfFiles[i], stampConfigs, repeatInterval);
                processedFiles.push({
                    name: pdfFiles[i].name,
                    data: processedPdf
                });
                pdfFiles[i].processed = true;
            }

            progressContainer.style.display = 'none';
            updateDownloadList();
            alert('All files processed successfully!');
        }

        async function processFileWithStamp(fileInfo, stampConfigs, repeatInterval) {
            const arrayBuffer = await fileInfo.file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width: pageWidth, height: pageHeight } = firstPage.getSize();

            // Get the scale ratio between PDF page and canvas
            const canvasWidth = fabricCanvas.width;
            const canvasHeight = fabricCanvas.height;
            const scaleX = pageWidth / canvasWidth;
            const scaleY = pageHeight / canvasHeight;

            // Embed all stamps
            const embeddedImages = await Promise.all(
                stampConfigs.map(async config => {
                    return await pdfDoc.embedPng(config.imageData);
                })
            );

            pages.forEach((page, pageIndex) => {
                // Apply stamps based on repeat interval
                if (repeatInterval === 0 || pageIndex % (repeatInterval || 1) === 0) {
                    const { width, height } = page.getSize();
                    
                    stampConfigs.forEach((config, index) => {
                        const stampImage = embeddedImages[index];
                        
                        // Convert canvas coordinates to PDF coordinates
                        // PDF coordinate system: (0,0) is bottom-left
                        // Canvas coordinate system: (0,0) is top-left
                        const pdfX = config.left * scaleX;
                        const pdfY = height - (config.top * scaleY) - (config.height * scaleY);
                        const pdfWidth = config.width * scaleX;
                        const pdfHeight = config.height * scaleY;

                        page.drawImage(stampImage, {
                            x: pdfX,
                            y: pdfY,
                            width: pdfWidth,
                            height: pdfHeight,
                            opacity: config.opacity
                        });
                    });
                }
            });

            return await pdfDoc.save();
        }

        function updateDownloadList() {
            const downloadList = document.getElementById('download-list');
            const noProcessedFiles = document.getElementById('no-processed-files');
            const downloadContainer = document.getElementById('download-container');

            if (processedFiles.length === 0) {
                noProcessedFiles.style.display = 'block';
                downloadContainer.style.display = 'none';
                return;
            }

            noProcessedFiles.style.display = 'none';
            downloadContainer.style.display = 'block';
            downloadList.innerHTML = '';

            processedFiles.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <input type="checkbox" checked data-index="${index}">
                    <span class="file-name">${file.name.replace('.pdf', '-stamped.pdf')}</span>
                    <button class="btn btn-primary" onclick="downloadSingleFile(${index})" style="padding: 5px 10px;">Download</button>
                `;
                downloadList.appendChild(item);
            });
        }

        function downloadSingleFile(index) {
            const file = processedFiles[index];
            const blob = new Blob([file.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.replace('.pdf', '-stamped.pdf');
            a.click();
            URL.revokeObjectURL(url);
        }

        async function downloadAllAsZip() {
            const zip = new JSZip();
            
            processedFiles.forEach(file => {
                zip.file(file.name.replace('.pdf', '-stamped.pdf'), file.data);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stamped-pdfs.zip';
            a.click();
            URL.revokeObjectURL(url);
        }

        async function downloadSelected() {
            const checkboxes = document.querySelectorAll('#download-list input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                alert('Please select at least one file');
                return;
            }

            if (checkboxes.length === 1) {
                const index = parseInt(checkboxes[0].dataset.index);
                downloadSingleFile(index);
                return;
            }

            const zip = new JSZip();
            checkboxes.forEach(checkbox => {
                const index = parseInt(checkbox.dataset.index);
                const file = processedFiles[index];
                zip.file(file.name.replace('.pdf', '-stamped.pdf'), file.data);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'selected-pdfs.zip';
            a.click();
            URL.revokeObjectURL(url);
        }

        // ========== TEMPLATE GENERATOR FUNCTIONS ==========

        function loadTemplateGallery() {
            const gallery = document.getElementById('template-gallery');
            gallery.innerHTML = '';

            templates.forEach(template => {
                const card = document.createElement('div');
                card.className = 'template-card';
                card.onclick = () => selectTemplate(template.id);
                
                // Create preview of template
                const previewImg = createTemplatePreview(template, 180);
                
                card.innerHTML = `
                    <img src="${previewImg}" alt="${template.name}">
                    <h4>${template.name}</h4>
                    <p>${template.description}</p>
                `;
                
                gallery.appendChild(card);
            });
        }

        function selectTemplate(templateId) {
            selectedTemplate = templates.find(t => t.id === templateId);
            
            // Update UI
            document.querySelectorAll('.template-card').forEach(card => {
                card.classList.remove('selected');
            });
            event.target.closest('.template-card').classList.add('selected');
            
            // Fill form with template defaults
            document.getElementById('selected-template-name').value = selectedTemplate.name;
            document.getElementById('template-header').value = selectedTemplate.defaultHeader;
            document.getElementById('template-label').value = selectedTemplate.defaultLabel;
            document.getElementById('template-number').value = selectedTemplate.defaultNumber;
            document.getElementById('template-header-color').value = selectedTemplate.headerColor;
            document.getElementById('template-text-color').value = selectedTemplate.textColor;
            
            // Auto preview
            previewTemplate();
        }

        function createTemplatePreview(template, width) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const scale = width / 350;
            canvas.width = width;
            canvas.height = width * 0.4; // Aspect ratio
            
            // Background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3 * scale;
            ctx.strokeRect(5 * scale, 5 * scale, canvas.width - 10 * scale, canvas.height - 10 * scale);
            
            // Inner line
            ctx.beginPath();
            ctx.moveTo(10 * scale, canvas.height * 0.45);
            ctx.lineTo(canvas.width - 10 * scale, canvas.height * 0.45);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            
            // Header section
            ctx.save();
            ctx.fillStyle = template.headerColor;
            
            if (template.hasLogo) {
                // Draw BSS logo style
                ctx.font = `bold ${28 * scale}px Arial`;
                const logoText = template.logoText || 'BSS';
                ctx.fillText(logoText, 15 * scale, 40 * scale);
                
                // Draw diagonal lines for BSS style
                ctx.strokeStyle = template.headerColor;
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(15 * scale, 20 * scale);
                ctx.lineTo(85 * scale, 48 * scale);
                ctx.moveTo(25 * scale, 20 * scale);
                ctx.lineTo(95 * scale, 48 * scale);
                ctx.stroke();
            }
            
            // Header text
            ctx.font = `bold ${20 * scale}px Arial`;
            const headerX = template.hasLogo ? 110 * scale : 20 * scale;
            ctx.fillText(template.defaultHeader, headerX, 40 * scale);
            ctx.restore();
            
            // Label and Number
            ctx.fillStyle = template.textColor;
            ctx.font = `${18 * scale}px Arial`;
            ctx.fillText(template.defaultLabel + ' ' + template.defaultNumber, 20 * scale, canvas.height * 0.75);
            
            return canvas.toDataURL();
        }

        function previewTemplate() {
            if (!selectedTemplate) {
                alert('Please select a template first');
                return;
            }

            const header = document.getElementById('template-header').value || selectedTemplate.defaultHeader;
            const label = document.getElementById('template-label').value || selectedTemplate.defaultLabel;
            const number = document.getElementById('template-number').value || selectedTemplate.defaultNumber;
            const width = parseInt(document.getElementById('template-width').value) || 350;
            const headerColor = document.getElementById('template-header-color').value;
            const textColor = document.getElementById('template-text-color').value;

            const previewDiv = document.getElementById('template-preview');
            const previewImg = generateTemplateImage(
                header, label, number, width, headerColor, textColor, selectedTemplate.hasLogo
            );
            
            previewDiv.innerHTML = `<img src="${previewImg}" alt="Preview" style="max-width: 100%; border: 1px solid #ddd;">`;
        }

        function generateTemplateImage(header, label, number, width, headerColor, textColor, hasLogo) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = width;
            canvas.height = width * 0.4; // Keep aspect ratio
            
            // Background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Outer border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
            
            // Inner dividing line
            const dividerY = canvas.height * 0.45;
            ctx.beginPath();
            ctx.moveTo(15, dividerY);
            ctx.lineTo(canvas.width - 15, dividerY);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Header section (top part)
            ctx.save();
            
            let headerX = 25;
            
            if (hasLogo) {
                // Draw BSS-style logo
                ctx.fillStyle = headerColor;
                ctx.font = 'bold 32px Arial';
                ctx.fillText('BSS', headerX, canvas.height * 0.28);
                
                // Draw diagonal stripes for BSS logo effect
                ctx.strokeStyle = headerColor;
                ctx.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(headerX + (i * 12), 15);
                    ctx.lineTo(headerX + 70 + (i * 12), canvas.height * 0.35);
                    ctx.stroke();
                }
                
                headerX = 120;
            }
            
            // Header text
            ctx.fillStyle = headerColor;
            ctx.font = 'bold 28px Arial';
            ctx.fillText(header, headerX, canvas.height * 0.28);
            ctx.restore();
            
            // Bottom section - Label and Number
            ctx.fillStyle = textColor;
            ctx.font = 'bold 24px Arial';
            const labelY = canvas.height * 0.72;
            
            // Draw label
            ctx.fillText(label, 35, labelY);
            
            // Measure label width to position number
            const labelWidth = ctx.measureText(label).width;
            
            // Draw number (slightly larger and bold)
            ctx.font = 'bold 32px Arial';
            ctx.fillText(number, 35 + labelWidth + 15, labelY);
            
            return canvas.toDataURL('image/png');
        }

        function generateAndSaveTemplate() {
            if (!selectedTemplate) {
                alert('Please select a template first');
                return;
            }

            const header = document.getElementById('template-header').value;
            const label = document.getElementById('template-label').value;
            const number = document.getElementById('template-number').value;
            
            if (!header || !label || !number) {
                alert('Please fill in all fields');
                return;
            }

            const width = parseInt(document.getElementById('template-width').value) || 350;
            const headerColor = document.getElementById('template-header-color').value;
            const textColor = document.getElementById('template-text-color').value;

            const stampImage = generateTemplateImage(
                header, label, number, width, headerColor, textColor, selectedTemplate.hasLogo
            );

            // Add to stamps library
            stamps.push({
                id: Date.now(),
                type: 'template',
                data: stampImage,
                template: selectedTemplate.name,
                number: number
            });

            saveStampsToStorage();
            updateStampList();

            alert(`Template stamp "${header} - ${number}" berhasil ditambahkan ke library!`);
            
            // Optional: switch to stamp tab to show result
            // switchTab('stamp');
        }

        function handleTemplateUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Show in preview
                    const previewDiv = document.getElementById('template-preview');
                    previewDiv.innerHTML = `<img src="${event.target.result}" alt="Uploaded Template" style="max-width: 100%; border: 1px solid #ddd;">`;
                    
                    if (confirm('Add this template to stamp library?')) {
                        stamps.push({
                            id: Date.now(),
                            type: 'template-upload',
                            data: event.target.result
                        });
                        saveStampsToStorage();
                        updateStampList();
                        alert('Template uploaded successfully!');
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }

        // ========== END TEMPLATE GENERATOR FUNCTIONS ==========