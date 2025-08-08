let treeData = null;
let selectedNode = null;
let currentSearchQuery = '';
let hasUnsavedChanges = false;
let editor; // Ganti dari quill ke editor CKEditor



///////////////node coloring///////////////////
// Color scheme untuk setiap level (1-10)


// Color scheme dengan stroke yang lebih gelap/kontras
const nodeColors = [
    { fill: '#e74c3c', stroke: '#7f1e17' }, // Level 0 - Merah (stroke jauh lebih gelap)
    { fill: '#3498db', stroke: '#1a5490' }, // Level 1 - Biru
    { fill: '#2ecc71', stroke: '#145a32' }, // Level 2 - Hijau
    { fill: '#f39c12', stroke: '#7e5109' }, // Level 3 - Orange
    { fill: '#9b59b6', stroke: '#512e5f' }, // Level 4 - Ungu
    { fill: '#1abc9c', stroke: '#0e6251' }, // Level 5 - Turquoise
    { fill: '#e67e22', stroke: '#7e3811' }, // Level 6 - Carrot
    { fill: '#34495e', stroke: '#17202a' }, // Level 7 - Abu tua
    { fill: '#f1c40f', stroke: '#7d6608' }, // Level 8 - Kuning
    { fill: '#5FA71F', stroke: '#424949' }, // Level 9 - Abu muda
    { fill: '#fd79a8', stroke: '#a93671' }  // Level 10 - Pink
];

// Fungsi untuk mendapatkan warna berdasarkan level
function getNodeColor(level) {
    // Jika level > 10, gunakan modulo untuk cycle kembali
    const colorIndex = level % nodeColors.length;
    return nodeColors[colorIndex];
}


///////////////end node coloring///////////////////



// Fungsi handler yang diberi nama untuk CKEditor
function onEditorChange() {
    if (selectedNode && editor) {
        selectedNode.content = editor.getData();
        saveToLocalStorage();
        markUnsavedChanges();
    }
}

window.onload = function () {
    // Inisialisasi CKEditor menggantikan Quill
    editor = CKEDITOR.replace('editor', {
        height: 200,
        extraPlugins: 'pastefromword,pastefromgdocs,pastetools,table,tabletools,tableselection,clipboard,specialchar,pagebreak,div,dialog,find,image,link,pagebreak,showblocks,liststyle,smiley,exportpdf',
		
		// Paste configuration
		pasteFromWordRemoveFontStyles: false,
		pasteFromWordRemoveStyles: false,
		pasteFromWordPromptCleanup: true,
    
		// Advanced paste filtering
		pasteFilter: 'semantic-content',
    
		// Google Docs paste configuration
		pasteFromGoogleDocRemoveFontFamily: false,
    
		// Notification for paste operations
		clipboard_notificationDuration: 3000,
    


		
		toolbar: [
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat'] },
            { name: 'paragraph', items: ['NumberedList', 'BulletedList', 'MergeCells','SplitCell', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'] },
            { name: 'insert', items: ['Image', 'Table', 'HorizontalRule', 'SpecialChar', 'PageBreak', 'Smiley','CreateDiv'] },
            { name: 'styles', items: ['ListStyle', 'Styles', 'Format', 'Font', 'FontSize'] },
            { name: 'colors', items: ['TextColor', 'BGColor'] },
            { name: 'tools', items: ['Maximize', 'ShowBlocks', 'ExportPdf', 'Source'] },
			{ name: 'clipboard', items: [ 'Undo','Redo','Cut','Copy','Paste','PasteText','PasteFromWord','PasteFromGDocs' ] },
			{ name: 'editing', items: ['Find', 'Replace', '-', 'SelectAll'] },
	        { name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
			{ name: 'table',     items: [ 'TableProperties','DeleteTable','TableCellProperties','InsertRowAbove','InsertRowBelow','DeleteRow','InsertColumnLeft','InsertColumnRight','DeleteColumn' ] }

  



        ],
        // Plugin yang tersedia di full build
        //extraPlugins: 'tableresize,autogrow',
        removePlugins: 'elementspath',
		
        // Table plugin configuration
        //removePlugins: 'resize',
        //extraPlugins: 'pastetools,pastefromword,pastefromgdocs,tabletools,tableselection',
		


        autoGrow_minHeight: 200,
        autoGrow_maxHeight: 300,
        autoGrow_onStartup: false,
        // Table default settings
        table_defaultWidth: '100%',
        table_defaultBorder: 1,
        table_defaultCellPadding: 4,
        table_defaultCellSpacing: 0
    });
    
	
	
	
	
	    // FIX: Ensure mindmap container has height
    const mindmapContainer = document.getElementById('mindmap');
    const mainContainer = mindmapContainer.parentElement;
    
    // Force recalculate layout
    setTimeout(() => {
        if (mindmapContainer.clientHeight === 0) {
            const headerHeight = document.querySelector('header').offsetHeight || 50;
            const availableHeight = window.innerHeight - headerHeight;
            mainContainer.style.height = availableHeight + 'px';
        }
        
        loadDefaultMindMap();
    }, 100);
    
	
	// Setup event listener untuk auto-save
    editor.on('change', onEditorChange);

    document.getElementById('nodeTitle').addEventListener('input', function () {
        if (selectedNode) {
            selectedNode.title = this.value;
            saveToLocalStorage();
            markUnsavedChanges();
            renderMindMap();
        }
    });

    loadDefaultMindMap();
};













// Load default mind map dari JSON
function loadDefaultMindMap() {
    fetch('mindmap.json')
        .then(res => res.json())
        .then(data => {
            treeData = data;
            autoLoadFromLocalStorage();
            renderMindMap();
        });
}

// Render mind map dengan D3.js (tetap sama)
function renderMindMap() {
    // Simpan transform zoom saat ini agar tidak reset
    let currentTransform = d3.zoomIdentity;
    const svgNode = d3.select('#mindmap svg').node();
    if (svgNode) {
        currentTransform = d3.zoomTransform(svgNode);
    }

    document.getElementById('mindmap').innerHTML = '';

    let width = document.getElementById('mindmap').clientWidth;
    let height = document.getElementById('mindmap').clientHeight;
	
	//////////////////////////////fix/////////////////////////////////
	
	    // FIX: Handle zero height
    if (height === 0) {
        // Gunakan parent height atau window height
        const parent = document.getElementById('mindmap').parentElement;
        height = parent.clientHeight || window.innerHeight - 100;
        
        // Jika masih 0, gunakan default
        if (height <= 0) {
            height = 600;
        }
    }
    
    if (width === 0) {
        width = 800; // Default width
    }
    
    console.log('Mind map dimensions after fix:', { width, height });
    


    
    // ... rest of the function remains the same
	
	///////////////////////////////end fix//////////////////////////////
    
    // Variabel svg utama
    let svgRoot = d3.select('#mindmap').append('svg')
        .attr('width', width)
        .attr('height', height);

    // Grup utama untuk semua elemen, yang akan di-zoom dan di-pan
    let g = svgRoot.append('g');
    
    // Atur zoom dan pan, pastikan double click tidak memicu zoom
    svgRoot.call(d3.zoom()
        .on("zoom", function (event) {
            g.attr("transform", event.transform);
        })
        .filter(event => event.type !== 'dblclick')
    ).on("dblclick.zoom", null);
    
    let root = d3.hierarchy(treeData);
    let treeLayout = d3.tree().size([height, width - 200]);
    treeLayout(root);

    g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        );

    // --- AWAL KODE DRAG AND DROP YANG DIPERBAIKI ---
    let dragNode = null;
    let dropTarget = null;
    let ghost = null; // Variabel untuk ghost element
    
    let node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', d => {
            let cls = 'node';
            if (selectedNode && selectedNode === d.data) cls += ' selected';
            if (d.data._children) cls += ' collapsed';
            return cls;
        })
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('click', (event, d) => {
            event.stopPropagation();
            selectNode(d.data);
            renderMindMap();
        })
        .on('dblclick', (event, d) => {
            event.stopPropagation();
            toggleCollapse(d.data);
            saveToLocalStorage();
            markUnsavedChanges();
            renderMindMap();
        })
        .call(d3.drag()
            .on('start', (event, d) => {
                if (d.data === treeData) return;
                dragNode = d.data;

                // 1. Buat Ghost Element
                ghost = g.append('g')
                    .attr('class', 'ghost-node')
                    .attr('pointer-events', 'none');
                ghost.append('circle')
                    .attr('r', 20)
                    .attr('fill', '#ccc')
                    .attr('opacity', 0.7);
                ghost.append('text')
                    .attr('dy', 4)
                    .attr('x', 25)
                    .text(d.data.title)
                    .attr('opacity', 0.8);
            })
            .on('drag', (event) => {
                if (!dragNode) return;
                
                // 2. Perbarui posisi ghost dengan memperhitungkan zoom/pan
                const transform = d3.zoomTransform(svgRoot.node());
                const [mx, my] = transform.invert(d3.pointer(event, svgRoot.node()));
                
                if (ghost) {
                    ghost.attr('transform', `translate(${mx},${my})`);
                }

                // Reset drop target dan highlight
                dropTarget = null;
                d3.selectAll('.node circle').attr('stroke', null);

                // Cari node yang berada di bawah kursor
                g.selectAll('.node').each(function(nd) {
                    // Jangan jadikan diri sendiri atau anak dari node yg di-drag sebagai target
                    let isDescendant = false;
                    let p = nd;
                    while (p) {
                        if (p.data === dragNode) {
                            isDescendant = true;
                            break;
                        }
                        p = p.parent;
                    }
                    if (nd.data === dragNode || isDescendant) return;

                    const bbox = this.getBBox();
                    if (mx > nd.y + bbox.x && mx < nd.y + bbox.x + bbox.width &&
                        my > nd.x + bbox.y && my < nd.x + bbox.y + bbox.height) {
                        
                        dropTarget = nd.data;
                        d3.select(this).select('circle')
                            .attr('stroke', '#e74c3c')
                            .attr('stroke-width', 3);
                    }
                });
            })
            .on('end', () => {
                // 3. Hapus Ghost Element
                if (ghost) {
                    ghost.remove();
                    ghost = null;
                }
                
                d3.selectAll('.node circle').attr('stroke', null);

                if (dragNode && dropTarget && dropTarget !== dragNode) {
                    moveNode(dragNode, dropTarget);
                    saveToLocalStorage();
                    markUnsavedChanges();
                    renderMindMap();
                }
                
                dragNode = null;
                dropTarget = null;
            })
        );
    // --- AKHIR KODE DRAG AND DROP ---
	    // --- AKHIR KODE DRAG AND DROP ---

    //node.append('circle')
    //    .attr('r', 20);
	
	node.append('circle')
        .attr('r', 20)
        .attr('fill', d => {
            const color = getNodeColor(d.depth);
            // Jika node selected, gunakan warna khusus
            if (selectedNode && selectedNode === d.data) {
                return '#ff6b6b'; // Warna khusus untuk selected
            }
            return color.fill;
        })
        .attr('stroke', d => {
            const color = getNodeColor(d.depth);
			console.log(`Node level ${d.depth}: stroke color = ${color.stroke}`); // Debug

            if (selectedNode && selectedNode === d.data) {
                return '#8B0080'; // Stroke untuk selected
            }
            return color.stroke;
        })
        .attr('stroke-width', d => {
            return selectedNode && selectedNode === d.data ? 3 : 2;
        });	
	
		
	

	
	// Outer selection ring (hanya untuk selected)
    node.filter(d => selectedNode && selectedNode === d.data)
        .append('circle')
        .attr('r', 25)  // Lebih besar dari node
        .attr('fill', 'none')
        .attr('stroke', '#8B0080')  // Hot pink
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,3')
        .style('animation', 'pulse 1.5s infinite');
    
    // Normal node circle
	/*
    node.append('circle')
        .attr('r', 20)
        .style('fill', d => getNodeColor(d.depth).fill)
        .style('stroke', d => getNodeColor(d.depth).stroke)
        .style('stroke-width', 2);
	*/	
	
	
	// Append text - GANTI dengan kode ini
    node.append('text')
        .attr('dy', 4)
        .attr('text-anchor', 'middle')  // Center the text
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .style('fill', 'white')  // White text untuk kontras
        .text(d => d.depth);  // Tampilkan depth/level number
    
    // Append title text di luar circle
    node.append('text')
        .attr('dy', 4)
        .attr('x', d => (d.children || d.data._children) ? -35 : 35)  // Adjust position
        .style('text-anchor', d => (d.children || d.data._children) ? 'end' : 'start')
        .style('font-size', '12px')
        .style('fill', '#2c3e50')
        .text(d => d.data.title);
    

    
	g.attr('transform', currentTransform);
	
    
    // Tambahkan color legend (opsional)
    createColorLegend();



}

	////////////////////////////////////////////////////////////////////////////
// Pilih node untuk diedit - Modified for CKEditor
function selectNode(nodeData) {
    selectedNode = nodeData;
    document.getElementById('nodeTitle').value = nodeData.title || '';

    if (editor) {
        // Matikan sementara listener auto-save
        editor.removeListener('change', onEditorChange);

        // Set konten editor
        editor.setData(nodeData.content || '');

        // Tunggu editor selesai render, lalu highlight jika ada pencarian
        setTimeout(() => {
            if (currentSearchQuery) {
                highlightInCKEditor(currentSearchQuery);
            }
            // Aktifkan kembali listener
            editor.on('change', onEditorChange);
        }, 100);
    }
}

// Update node setelah edit - Modified for CKEditor
function updateNodeContent() {
    if (!selectedNode || !editor) return;
    selectedNode.title = document.getElementById('nodeTitle').value;
    selectedNode.content = editor.getData();
    saveToLocalStorage();
    markUnsavedChanges();
    renderMindMap();
}

// Buat mind map baru
function newMindMap() {
    if (!confirm("Mulai mind map baru? Perubahan yang belum disimpan akan hilang.")) return;
    treeData = { title: "Topik Baru", content: "", children: [] };
    selectedNode = null;
    saveToLocalStorage();
    markUnsavedChanges();
    renderMindMap();
}

// Save ke localStorage
function saveToLocalStorage() {
    localStorage.setItem('mindmapData', JSON.stringify(treeData));
}

// Load dari localStorage
function autoLoadFromLocalStorage() {
    let saved = localStorage.getItem('mindmapData');
    if (saved) {
        treeData = JSON.parse(saved);
    }
}

// Save As file JSON
function saveAsMindMap() {
    let blob = new Blob([JSON.stringify(treeData, null, 2)], { type: "application/json" });
    saveAs(blob, "mindmap.json");
    
    // Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Save overwrite
function saveMindMap() {
    saveToLocalStorage();
    alert("Mind map disimpan di penyimpanan lokal.");
    // Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Open file JSON
function openMindMap(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function (e) {
        treeData = JSON.parse(e.target.result);
        renderMindMap();
        saveToLocalStorage();
        markUnsavedChanges();
    };
    reader.readAsText(file);
    
    // Reset status
    hasUnsavedChanges = false;
    document.title = document.title.replace("* ", "");
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.remove('unsaved');
    }
}

// Fungsi recursive buat outline
function generateOutline(node, level) {
    let prefix = "  ".repeat(level);
    let text = prefix + (node.title || "Tanpa Judul") + "\n";

    // Cek apakah ada konten yang berarti sebelum memprosesnya
    if (node.content && node.content.trim() !== '<p><br></p>') {
        
        // Gunakan fungsi pembantu baru kita untuk membersihkan konten
        const cleanContent = htmlToPlainText(node.content);

        // Hanya tambahkan konten jika setelah dibersihkan masih ada isinya
        if (cleanContent) {
            // Beri indentasi pada konten agar terlihat rapi di bawah judulnya
            const contentPrefix = "  ".repeat(level + 1);
            // Ganti setiap baris baru di dalam konten dengan baris baru + indentasi
            const indentedContent = contentPrefix + cleanContent.replace(/\n/g, '\n' + contentPrefix);
            text += indentedContent + "\n\n"; // Tambahkan spasi ekstra setelah blok konten
        }
    }

    // Lakukan rekursi untuk anak-anak node (termasuk yang ter-collapse)
    const children = node.children || node._children || [];
    children.forEach(child => {
        text += generateOutline(child, level + 1);
    });

    return text;
}

function addChildNode() {
    if (!selectedNode) {
        alert("Pilih sebuah node terlebih dahulu.");
        return;
    }
    // Jika node ter-collapse, expand dulu
    if (selectedNode._children) {
        selectedNode.children = selectedNode._children;
        selectedNode._children = null;
    }
    if (!selectedNode.children) {
        selectedNode.children = [];
    }
    selectedNode.children.push({
        title: "Node Baru",
        content: "",
        children: []
    });
    saveToLocalStorage();
    renderMindMap();
    markUnsavedChanges();
}

// Delete node - Modified for CKEditor
function deleteNode() {
    if (!selectedNode) {
        alert("Pilih sebuah node terlebih dahulu.");
        return;
    }
    if (selectedNode === treeData) {
        alert("Tidak bisa menghapus node utama.");
        return;
    }

    // Fungsi rekursif untuk mencari dan menghapus node
    function removeNodeRecursive(parent, nodeToRemove) {
        if (!parent.children) return false;
        
        const index = parent.children.indexOf(nodeToRemove);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }
        
        // Cari di anak-anaknya
        for (const child of parent.children) {
            if (removeNodeRecursive(child, nodeToRemove)) {
                return true;
            }
        }
        return false;
    }

    removeNodeRecursive(treeData, selectedNode);
    selectedNode = null;
    // Bersihkan editor CKEditor
    document.getElementById('nodeTitle').value = '';
    if (editor) {
        editor.setData('');
    }

    saveToLocalStorage();
    renderMindMap();
    markUnsavedChanges();
}

// Search node - Modified for CKEditor
function searchNode() {
    // Perbarui variabel global dengan query saat ini
    currentSearchQuery = document.getElementById('searchInput').value.toLowerCase();

    // Jika query kosong, pastikan untuk membersihkan sorotan di editor
    if (!currentSearchQuery && selectedNode && editor) {
        clearCKEditorHighlight();
    }

    d3.selectAll('.node').classed('search-match', function(d) {
        if (!currentSearchQuery) {
            return false;
        }
        const titleMatch = d.data.title && d.data.title.toLowerCase().includes(currentSearchQuery);
        let contentMatch = false;
        if (d.data.content) {
            const plainTextContent = htmlToPlainText(d.data.content);
            contentMatch = plainTextContent.toLowerCase().includes(currentSearchQuery);
        }
        return titleMatch || contentMatch;
    });

    // Update highlight di editor jika node yang dipilih match
    if (selectedNode && currentSearchQuery && editor) {
        highlightInCKEditor(currentSearchQuery);
    }
}

// Fungsi baru untuk highlight di CKEditor
function highlightInCKEditor(query) {
    if (!editor || !query) return;

    try {
        // Clear previous highlights first
        clearCKEditorHighlight();
        
        // Get editor content
        const editorBody = editor.document.getBody();
        const htmlContent = editorBody.getHtml();
        
        // Create temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Function to highlight text nodes
        // Function to highlight text nodes
        function highlightTextNode(node) {
            if (node.nodeType === 3) { // Text node
                const text = node.textContent;
                const lowerText = text.toLowerCase();
                const lowerQuery = query.toLowerCase();
                
                if (lowerText.includes(lowerQuery)) {
                    const span = document.createElement('span');
                    span.style.backgroundColor = '#fff3cd';
                    
                    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
                    span.innerHTML = text.replace(regex, '<span style="background-color: #fff3cd;">$1</span>');
                    
                    node.parentNode.replaceChild(span, node);
                }
            } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                // Element node
                for (let i = 0; i < node.childNodes.length; i++) {
                    highlightTextNode(node.childNodes[i]);
                }
            }
        }
        
        // Helper function to escape regex special characters
        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        
        // Apply highlighting
        highlightTextNode(tempDiv);
        
        // Set the highlighted content back to editor
        editor.setData(tempDiv.innerHTML);
        
    } catch (error) {
        console.warn('Error highlighting in CKEditor:', error);
    }
}

// Fungsi untuk clear highlight di CKEditor
function clearCKEditorHighlight() {
    if (!editor) return;
    
    try {
        const content = editor.getData();
        // Remove all highlight spans
        const cleanContent = content.replace(/<span[^>]*style="background-color:\s*#fff3cd[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');
        
        // Only update if content changed
        if (content !== cleanContent) {
            editor.setData(cleanContent);
        }
    } catch (error) {
        console.warn('Error clearing highlights:', error);
    }
}

function toggleCollapse(node) {
    if (node.children) {
        node._children = node.children;
        node.children = null;
    } else if (node._children) {
        node.children = node._children;
        node._children = null;
    }
}

// Fungsi untuk memindahkan node
function moveNode(nodeToMove, newParent) {
    // Fungsi untuk menghapus node dari parent lamanya
    function removeFromParent(parent, node) {
        if (!parent.children) return false;
        
        let index = parent.children.indexOf(node);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }
        
        // Cari di anak-anaknya jika tidak ketemu
        for (const child of parent.children) {
            if (removeFromParent(child, node)) {
                return true;
            }
        }
        return false;
    }

    // Hapus node dari posisi lamanya
    removeFromParent(treeData, nodeToMove);

    // Tambahkan node ke parent barunya
    // Jika parent baru ter-collapse, expand dulu
    if (newParent._children) {
        newParent.children = newParent._children;
        newParent._children = null;
    }
    if (!newParent.children) {
        newParent.children = [];
    }
    newParent.children.push(nodeToMove);
    markUnsavedChanges();
}

// Fungsi untuk menandai perubahan belum disimpan
function markUnsavedChanges() {
    if (hasUnsavedChanges) return;

    hasUnsavedChanges = true;
    
    // Tambahkan tanda bintang (*) ke judul tab browser
    if (!document.title.startsWith('*')) {
        document.title = "* " + document.title;
    }
    
    // Ubah tampilan tombol Save As agar menarik perhatian
    const saveAsButton = document.querySelector('button[onclick="saveAsMindMap()"]');
    if (saveAsButton) {
        saveAsButton.classList.add('unsaved');
    }
}

// Fungsi untuk convert HTML ke plain text
function htmlToPlainText(htmlString) {
    if (!htmlString) return "";

    // 1. Ganti tag <p> dan <br> dengan newline untuk menjaga struktur paragraf
    let text = htmlString
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n");

    // 2. Gunakan DOMParser untuk menghilangkan semua tag yang tersisa dan mengubah entitas
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    text = doc.body.textContent || "";

    // 3. Bersihkan hasil akhir
    text = text.replace(/(\n\s*){3,}/g, '\n\n');
    text = text.trim();

    return text;
}

// Event listener untuk beforeunload
window.addEventListener('beforeunload', function (e) {
    // Destroy CKEditor instance saat window unload
    if (editor && !editor.destroyed) {
        editor.destroy();
    }
    
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Keyboard shortcuts - Modified for CKEditor
/*

document.addEventListener('keydown', function (event) {
    const activeElement = document.activeElement;
    const isCKEditorActive = editor && editor.mode === 'wysiwyg' && editor.focusManager.hasFocus;
    const isTyping = activeElement.tagName === 'INPUT' || isCKEditorActive;

    if (!isTyping) {
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveAsMindMap();
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            exportOutline('txt');
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'd') {
            event.preventDefault();
            exportOutline('docx');
        }
        if (event.ctrlKey && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            newMindMap();
        }
    }

    // Tambahkan shortcut untuk delete node
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        if (!isTyping) {
            event.preventDefault();
            if (confirm(`Anda yakin ingin menghapus node "${selectedNode.title}"?`)) {
                deleteNode();
            }
        }
    }
});

*/



///////////////////shirtcut tambahan////////////////////////

// Keyboard shortcuts - UPDATE dengan shortcuts baru
document.addEventListener('keydown', function (event) {
    const activeElement = document.activeElement;
    const isCKEditorActive = editor && editor.mode === 'wysiwyg' && editor.focusManager.hasFocus;
    const isTyping = activeElement.tagName === 'INPUT' || 
                     activeElement.tagName === 'TEXTAREA' || 
                     isCKEditorActive;

    // Ctrl + F - Focus to search (works anywhere)
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        document.getElementById('searchInput').focus();
        document.getElementById('searchInput').select();
        return;
    }

    // Escape - Deselect node & clear search
    if (event.key === 'Escape') {
        if (activeElement.id === 'searchInput') {
            activeElement.blur();
            activeElement.value = '';
            searchNode(); // Clear search highlights
        }
        if (selectedNode) {
            selectedNode = null;
            document.getElementById('nodeTitle').value = '';
            if (editor) editor.setData('');
            renderMindMap();
        }
        return;
    }

    // Skip other shortcuts if typing
    if (isTyping) return;

    // File operations
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveAsMindMap();
    }
    else if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        newMindMap();
    }
    
    // Export operations
    else if (event.ctrlKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        exportOutline('txt');
    }
    else if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        exportOutline('docx');
    }
    
    // Node operations
    else if (event.ctrlKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (selectedNode) {
            addChildNode();
        } else {
            alert('Please select a node first');
        }
    }
    
    // F2 - Edit node title
    else if (event.key === 'F2' && selectedNode) {
        event.preventDefault();
        document.getElementById('nodeTitle').focus();
        document.getElementById('nodeTitle').select();
    }
    
    // Delete node
    else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        event.preventDefault();
        if (confirm(`Delete node "${selectedNode.title}"?`)) {
            deleteNode();
        }
    }
    
    // Arrow key navigation
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        navigateNodes(event.key);
    }
});

// Fungsi baru untuk navigasi dengan arrow keys
function navigateNodes(direction) {
    if (!treeData) return;
    
    // Get current hierarchy
    const root = d3.hierarchy(treeData);
    const allNodes = root.descendants();
    
    if (!selectedNode) {
        // If no selection, select root
        selectNode(treeData);
        renderMindMap();
        return;
    }
    
    // Find current node in hierarchy
    const currentNode = allNodes.find(n => n.data === selectedNode);
    if (!currentNode) return;
    
    let targetNode = null;
    
    switch(direction) {
        case 'ArrowLeft':
            // Go to parent
            if (currentNode.parent) {
                targetNode = currentNode.parent.data;
            }
            break;
            
        case 'ArrowRight':
            // Go to first child
            if (currentNode.children && currentNode.children.length > 0) {
                targetNode = currentNode.children[0].data;
            } else if (currentNode.data._children && currentNode.data._children.length > 0) {
                // Expand collapsed node first
                toggleCollapse(currentNode.data);
                renderMindMap();
                return;
            }
            break;
            
        case 'ArrowUp':
            // Go to previous sibling
            if (currentNode.parent) {
                const siblings = currentNode.parent.children;
                const currentIndex = siblings.indexOf(currentNode);
                if (currentIndex > 0) {
                    targetNode = siblings[currentIndex - 1].data;
                }
            }
            break;
            
        case 'ArrowDown':
            // Go to next sibling
            if (currentNode.parent) {
                const siblings = currentNode.parent.children;
                const currentIndex = siblings.indexOf(currentNode);
                if (currentIndex < siblings.length - 1) {
                    targetNode = siblings[currentIndex + 1].data;
                }
            }
            break;
    }
    
    if (targetNode) {
        selectNode(targetNode);
        renderMindMap();
        
        // Scroll into view if needed
        scrollNodeIntoView(targetNode);
    }
}

// Helper function to scroll node into view
function scrollNodeIntoView(nodeData) {
    // Find the node element in SVG
    const nodeElement = d3.selectAll('.node')
        .filter(d => d.data === nodeData)
        .node();
    
    if (nodeElement) {
        const bbox = nodeElement.getBoundingClientRect();
        const mindmapContainer = document.getElementById('mindmap');
        const containerRect = mindmapContainer.getBoundingClientRect();
        
        // Check if node is outside visible area
        if (bbox.left < containerRect.left || 
            bbox.right > containerRect.right || 
            bbox.top < containerRect.top || 
            bbox.bottom > containerRect.bottom) {
            
            // Simple scroll to center
            nodeElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center', 
                inline: 'center' 
            });
        }
    }
}








/////////////////////////end shortcut////////////////////////
// FUNGSI EXPORT (tetap sama karena sudah support HTML dari editor apapun)

/**
 * FUNGSI UTAMA EXPORT - VERSI YANG DIPERBAIKI
 */
function exportOutline(type) {
    if (type === 'txt') {
        let outlineText = generateOutline(treeData, 0);
        let blob = new Blob([outlineText], { type: "text/plain;charset=utf-8" });
        saveAs(blob, "mindmap.txt");
        return;
    }

    if (type === 'docx') {
        try {
            const docChildren = [];
            
            // Tambahkan header dokumen
            docChildren.push(new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: "Mind Map Export",
                        bold: true,
                        size: 32,
                    })
                ],
                alignment: docx.AlignmentType.CENTER,
                spacing: { after: 400 }
            }));

            // Export semua data secara rekursif
            generateDocxRecursive(treeData, 0, docChildren);

            const doc = new docx.Document({
                creator: "Mind Mapper",
                title: "Mind Map Export",
                description: "Exported from Mind Mapper Application",
                
                // Konfigurasi yang kompatibel dengan Google Docs
                styles: {
                    default: {
                        heading1: {
                            run: {
                                size: 32,
                                bold: true,
                                color: "000000",
                            },
                            paragraph: {
                                spacing: { after: 240, before: 240 }
                            }
                        },
                        heading2: {
                            run: {
                                size: 28,
                                bold: true,
                                color: "1f1f1f",
                            },
                            paragraph: {
                                spacing: { after: 200, before: 200 }
                            }
                        },
                        heading3: {
                            run: {
                                size: 24,
                                bold: true,
                                color: "2f2f2f",
                            },
                            paragraph: {
                                spacing: { after: 160, before: 160 }
                            }
                        }
                    },
                    paragraphStyles: [
                        {
                            id: "mainTitle",
                            name: "Main Title",
                            basedOn: "Normal",
                            run: {
                                size: 36,
                                bold: true,
                                color: "000080",
                            },
                            paragraph: {
                                alignment: docx.AlignmentType.CENTER,
                                spacing: { after: 400, before: 200 }
                            }
                        },
                        {
                            id: "nodeTitle",
                            name: "Node Title", 
                            basedOn: "Normal",
                            run: {
                                size: 24,
                                bold: true,
                            },
                            paragraph: {
                                spacing: { after: 200, before: 200 }
                            }
                
				//////////////////////////////////////////////////////////////////////
				
						},
                        {
                            id: "nodeContent",
                            name: "Node Content",
                            basedOn: "Normal",
                            run: {
                                size: 22,
                            },
                            paragraph: {
                                spacing: { after: 120, before: 60 },
                                indent: { left: 360 }
                            }
                        }
                    ]
                },
                
                numbering: {
                    config: [
                        {
                            reference: "mindmap-outline",
                            levels: [
                                {
                                    level: 0,
                                    format: docx.LevelFormat.DECIMAL,
                                    text: "%1.",
                                    alignment: docx.AlignmentType.START,
                                    style: {
                                        run: { bold: true }
                                    }
                                },
                                {
                                    level: 1,
                                    format: docx.LevelFormat.LOWER_LETTER,
                                    text: "%2.",
                                    alignment: docx.AlignmentType.START,
                                    style: {
                                        paragraph: { indent: { left: 720 } }
                                    }
                                },
                                {
                                    level: 2,
                                    format: docx.LevelFormat.LOWER_ROMAN,
                                    text: "%3.",
                                    alignment: docx.AlignmentType.START,
                                    style: {
                                        paragraph: { indent: { left: 1440 } }
                                    }
                                },
                                {
                                    level: 3,
                                    format: docx.LevelFormat.DECIMAL,
                                    text: "%4.",
                                    alignment: docx.AlignmentType.START,
                                    style: {
                                        paragraph: { indent: { left: 2160 } }
                                    }
                                }
                            ]
                        }
                    ]
                },

                sections: [{
                    children: docChildren,
                    properties: {
                        page: {
                            margin: {
                                top: 1440,
                                right: 1440,
                                bottom: 1440,
                                left: 1440
                            }
                        }
                    }
                }]
            });

            // Generate dan download file
            docx.Packer.toBlob(doc).then(blob => {
                const timestamp = new Date().toISOString().slice(0, 10);
                saveAs(blob, `mindmap-export-${timestamp}.docx`);
                console.log("✅ DOCX export successful!");
            }).catch(error => {
                console.error("❌ DOCX export error:", error);
                alert("Error saat membuat file DOCX. Silakan coba lagi.");
            });

        } catch (error) {
            console.error("❌ Export DOCX failed:", error);
            alert("Terjadi kesalahan saat export DOCX: " + error.message);
        }
    }
}

// Sisanya tetap sama karena fungsi-fungsi ini tidak bergantung pada editor spesifik

function testDocxExport() {
    console.log("🧪 Testing DOCX export...");
    console.log("Tree data:", treeData);
    
    if (!treeData) {
        console.error("❌ No tree data available for export");
        return;
    }
    
    exportOutline('docx');
}

console.log("Mind Mapper DOCX Export loaded! Run testDocxExport() to test.");

// FUNGSI KONVERSI HTML KE DOCX (tetap sama)
function htmlToDocxRuns(htmlString) {
    if (!htmlString || htmlString.trim() === '') return [];
    
    const elements = [];
    
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        function processNode(node, inheritedStyle = {}) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text && text.trim() !== '') {
                    if (!elements.currentRuns) elements.currentRuns = [];
                    elements.currentRuns.push(new docx.TextRun({ 
                        text: text, 
                        ...inheritedStyle 
                    }));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let newStyle = { ...inheritedStyle };
                let shouldProcessChildren = true;
                
                const inlineStyles = parseInlineStyles(node.getAttribute('style'));
                newStyle = { ...newStyle, ...inlineStyles };
                
                switch (node.tagName.toUpperCase()) {
                    case 'TABLE':
                        finalizeCurrentRuns();
                        const table = processTable(node);
                        if (table) {
                            elements.push(table);
                        }
                        shouldProcessChildren = false;
                        break;
                        
                    case 'H1':
                        finalizeCurrentRuns();
                        newStyle.size = 32;
                        newStyle.bold = true;
                        break;
                    case 'H2':
                        finalizeCurrentRuns();
                        newStyle.size = 28;
                        newStyle.bold = true;
                        break;
                    case 'H3':
                        finalizeCurrentRuns();
                        newStyle.size = 24;
                        newStyle.bold = true;
                        break;
                        
                    case 'STRONG':
                    case 'B':
                        newStyle.bold = true;
                        break;
                    case 'EM':
                    case 'I':
                        newStyle.italics = true;
                        break;
                    case 'U':
                        newStyle.underline = {};
                        break;
                        
                    case 'BR':
                        if (!elements.currentRuns) elements.currentRuns = [];
                        elements.currentRuns.push(new docx.TextRun({ text: "", break: 1 }));
                        shouldProcessChildren = false;
                        break;
                    case 'P':
                        finalizeCurrentRuns();
                        break;
                        
                    case 'OL':
                        finalizeCurrentRuns();
                        shouldProcessChildren = false;
                        processOrderedList(node, newStyle);
                        break;
                    case 'UL':
                        finalizeCurrentRuns();
                        shouldProcessChildren = false;
                        processUnorderedList(node, newStyle);
                        break;
                        
                    case 'A':
                        const href = node.getAttribute('href');
                        if (href && (href.startsWith('http') || href.startsWith('mailto'))) {
                            try {
                                if (!elements.currentRuns) elements.currentRuns = [];
                                elements.currentRuns.push(new docx.ExternalHyperlink({
                                    children: [
                                        new docx.TextRun({
                                            text: node.textContent || href,
                                            color: "0000FF",
                                            underline: {}
                                        })
                                    ],
                                    link: href
                                }));
                                shouldProcessChildren = false;
                            } catch (e) {
                                newStyle.color = "0000FF";
                                newStyle.underline = {};
                            }
                        }
                        break;
                        
                    case 'BLOCKQUOTE':
                        finalizeCurrentRuns();
                        if (!elements.currentRuns) elements.currentRuns = [];
                        elements.currentRuns.push(new docx.TextRun({ text: "\" ", ...newStyle }));
                        newStyle.italics = true;
                        break;
                }
                
                if (shouldProcessChildren) {
                    node.childNodes.forEach(child => processNode(child, newStyle));
                }
                
                if (node.tagName.toUpperCase() === 'BLOCKQUOTE') {
                    if (!elements.currentRuns) elements.currentRuns = [];
                    elements.currentRuns.push(new docx.TextRun({ text: " \"", ...inheritedStyle }));
                }
            }
        }

        function finalizeCurrentRuns() {
            if (elements.currentRuns && elements.currentRuns.length > 0) {
                elements.push(new docx.Paragraph({
                    children: [...elements.currentRuns]
                }));
                elements.currentRuns = [];
            }
        }

        function processTable(tableNode) {
            const rows = [];
            const tableRows = tableNode.querySelectorAll('tr');
            
            let maxColumns = 0;
            tableRows.forEach(tr => {
                const cellCount = tr.querySelectorAll('td, th').length;
                maxColumns = Math.max(maxColumns, cellCount);
            });
            
            const availableWidthDXA = 9360;
            const columnWidthDXA = maxColumns > 0 ? Math.floor(availableWidthDXA / maxColumns) : availableWidthDXA;
            
            tableRows.forEach(tr => {
                const cells = [];
                const tableCells = tr.querySelectorAll('td, th');
                
                tableCells.forEach(cell => {
                    const cellStyle = parseInlineStyles(cell.getAttribute('style'));
                    const isHeader = cell.tagName.toUpperCase() === 'TH';
                    
                    const cellRuns = [];
                    cell.childNodes.forEach(child => {
                        if (child.nodeType === Node.TEXT_NODE) {
                            if (child.textContent.trim()) {
                                cellRuns.push(new docx.TextRun({ 
                                    text: child.textContent,
                                    bold: isHeader,
                                    ...cellStyle
                                }));
                            }
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            const childText = child.textContent;
                            if (childText.trim()) {
                                let childStyle = { ...cellStyle };
                                
                                switch (child.tagName.toUpperCase()) {
                                    case 'STRONG':
                                    case 'B':
                                        childStyle.bold = true;
                                        break;
                                    case 'EM':
                                    case 'I':
                                        childStyle.italics = true;
                                        break;
                                    case 'A':
                                        const href = child.getAttribute('href');
                                        if (href) {
                                            cellRuns.push(new docx.ExternalHyperlink({
                                                children: [
                                                    new docx.TextRun({
                                                        text: childText,
                                                        color: "0000FF",
                                                        underline: {}
                                                    })
                                                ],
                                                link: href
                                            }));
                                            return;
                                        }
                                        break;
                                }
                                
                                cellRuns.push(new docx.TextRun({ 
                                    text: childText, 
                                    ...childStyle 
                                }));
                            }
                        }
                    });
                    
                    if (cellRuns.length === 0) {
                        cellRuns.push(new docx.TextRun(" "));
                    }
                    
                    // cells.push(new docx.TableCell({
						
						
					//////////////////////////////////////////////////////////
					
					cells.push(new docx.TableCell({
                        children: [new docx.Paragraph({
                            children: cellRuns
                        })],
                        width: {
                            size: columnWidthDXA,
                            type: docx.WidthType.DXA
                        },
                        margins: {
                            top: 100,
                            bottom: 100,
                            left: 200,
                            right: 200
                        },
                        verticalAlign: docx.VerticalAlign.TOP,
                        shading: isHeader ? { fill: "F2F2F2" } : undefined
                    }));
                });
                
                if (cells.length > 0) {
                    rows.push(new docx.TableRow({
                        children: cells,
                        height: {
                            value: 300,
                            rule: docx.HeightRule.AT_LEAST
                        }
                    }));
                }
            });
            
            if (rows.length === 0) return null;
            
            return new docx.Table({
                rows: rows,
                width: {
                    size: availableWidthDXA,
                    type: docx.WidthType.DXA
                },
                borders: {
                    top: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
                    bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
                    left: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
                    right: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
                    insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 2, color: "666666" },
                    insideVertical: { style: docx.BorderStyle.SINGLE, size: 2, color: "666666" }
                },
                layout: docx.TableLayoutType.FIXED,
                columnWidths: Array(maxColumns).fill(columnWidthDXA),
                alignment: docx.AlignmentType.LEFT
            });
        }

        function processOrderedList(olNode, baseStyle) {
            let listCounter = 1;
            olNode.querySelectorAll('li').forEach(li => {
                if (!elements.currentRuns) elements.currentRuns = [];
                elements.currentRuns.push(new docx.TextRun({ 
                    text: `${listCounter}. `, 
                    bold: true,
                    ...baseStyle 
                }));
                
                li.childNodes.forEach(child => processNode(child, baseStyle));
                finalizeCurrentRuns();
                listCounter++;
            });
        }

        function processUnorderedList(ulNode, baseStyle) {
            ulNode.querySelectorAll('li').forEach(li => {
                if (!elements.currentRuns) elements.currentRuns = [];
                elements.currentRuns.push(new docx.TextRun({ 
                    text: "• ", 
                    bold: true,
                    ...baseStyle 
                }));
                
                li.childNodes.forEach(child => processNode(child, baseStyle));
                finalizeCurrentRuns();
            });
        }

        elements.currentRuns = [];
        doc.body.childNodes.forEach(child => processNode(child));
        finalizeCurrentRuns();
        
    } catch (error) {
        console.warn("Error parsing HTML content:", error);
        const plainText = htmlToPlainText(htmlString);
        if (plainText) {
            elements.push(new docx.Paragraph({
                children: [new docx.TextRun(plainText)]
            }));
        }
    }
    
    return elements;
}

function generateDocxRecursive(node, level, docChildren) {
    if (!node) return;

    const title = node.title || "Tanpa Judul";
    
    if (level === 0) {
        docChildren.push(new docx.Paragraph({
            children: [
                new docx.TextRun({
                    text: title,
                    bold: true,
                    size: 32,
                    color: "000080"
                })
            ],
            style: "mainTitle"
        }));
    } else {
        const hasExistingNumbering = /^\s*(\d+(\.\d+)*\.|[a-zA-Z]\.)/.test(title);
        
        if (hasExistingNumbering) {
            docChildren.push(new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: title,
                        bold: true,
                        size: Math.max(24 - level * 2, 18)
                    })
                ],
                indent: { left: 720 * (level - 1) },
                spacing: { after: 200, before: 100 }
            }));
        } else {
            docChildren.push(new docx.Paragraph({
                children: [
                    new docx.TextRun({
                        text: title,
                        bold: true,
                        size: Math.max(24 - level * 2, 18)
                    })
                ],
                numbering: {
                    reference: "mindmap-outline",
                    level: Math.min(level - 1, 3)
                },
                spacing: { after: 200, before: 100 }
            }));
        }
    }

    if (node.content && node.content.trim() !== '' && node.content.trim() !== '<p><br></p>') {
        try {
            const contentElements = htmlToDocxRuns(node.content);
            
            contentElements.forEach(element => {
                if (element instanceof docx.Table) {
                    docChildren.push(element);
                } else if (element instanceof docx.Paragraph) {
                    if (level > 0) {
                        element.indent = { left: 720 * Math.max(level, 1) };
                        element.spacing = { after: 120, before: 60 };
                    }
                    docChildren.push(element);
                }
            });
            
        } catch (error) {
            console.warn("Error processing content for node:", title, error);
            const plainContent = htmlToPlainText(node.content);
            if (plainContent) {
                docChildren.push(new docx.Paragraph({
                    children: [new docx.TextRun(plainContent)],
                    indent: { left: 720 * Math.max(level, 1) },
                    spacing: { after: 120, before: 60 }
                }));
            }
        }
    }

    const children = node.children || node._children || [];
    children.forEach(child => {
        generateDocxRecursive(child, level + 1, docChildren);
    });
}

function parseInlineStyles(styleString) {
    const styles = {};
    if (!styleString) return styles;
    
    try {
        const declarations = styleString.split(';');
        declarations.forEach(declaration => {
            const [property, value] = declaration.split(':').map(s => s.trim());
            if (property && value) {
                switch (property.toLowerCase()) {
                    case 'color':
                        styles.color = parseColor(value);
                        break;
                    case 'background-color':
                        styles.shading = { fill: parseColor(value) };
                        break;
                    case 'font-weight':
                        if (value === 'bold' || parseInt(value) >= 600) {
                            styles.bold = true;
                        }
                        break;
                    case 'font-style':
                        if (value === 'italic') {
                            styles.italics = true;
                        }
                        break;
                    case 'text-decoration':
                        if (value.includes('underline')) {
                            styles.underline = {};
                        }
                        if (value.includes('line-through')) {
                            styles.strike = true;
                        }
                        break;
                    case 'font-family':
                        styles.font = value.replace(/['"]/g, '').split(',')[0].trim();
                        break;
                    case 'font-size':
                        const size = parseFontSize(value);
                        if (size) styles.size = size;
                        break;
                }
            }
        });
    } catch (error) {
        console.warn("Error parsing inline styles:", error);
    }
    
    return styles;
}

function parseColor(colorValue) {
    if (!colorValue) return undefined;
    
    colorValue = colorValue.trim();
    
    if (colorValue.startsWith('#')) {
        return colorValue.substring(1).toUpperCase();
    }
    
    const rgbMatch = colorValue.match(/rgba?\s*$\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*$/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        return [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }
    
    const namedColors = {
        'black': '000000',
        'white': 'FFFFFF',
        'red': 'FF0000',
        'green': '008000',
        'blue': '0000FF',
        'yellow': 'FFFF00',
        'orange': 'FFA500',
        'purple': '800080',
        'pink': 'FFC0CB',
        'brown': 'A52A2A',
        'gray': '808080',
        'grey': '808080'
    };
    
    return namedColors[colorValue.toLowerCase()] || undefined;
}

		
		///////////////////////////////////////////////////////////////////////////
		
		
function parseFontSize(sizeValue) {
    if (!sizeValue) return undefined;
    
    const match = sizeValue.match(/(\d+(?:\.\d+)?)(px|pt|em|rem|%)?/);
    if (match) {
        let size = parseFloat(match[1]);
        const unit = match[2] || 'px';
        
        // Convert to half-points (DOCX unit)
        switch (unit) {
            case 'pt':
                return Math.round(size * 2);
            case 'px':
                return Math.round(size * 1.5); // Approximation: 1px ≈ 0.75pt
            case 'em':
            case 'rem':
                return Math.round(size * 24); // Assuming 12pt base
            default:
                return Math.round(size * 2); // Treat as points
        }
    }
    
    return undefined;
}

function splitContentIntoParagraphs(runs) {
    const paragraphs = [];
    let currentParagraph = [];
    
    runs.forEach((run, index) => {
        if (run.break) {
            // Jika ada line break, tutup paragraf saat ini
            if (currentParagraph.length > 0) {
                paragraphs.push([...currentParagraph]);
                currentParagraph = [];
            }
            // Jangan tambahkan run yang cuma line break
        } else {
            currentParagraph.push(run);
        }
    });
    
    // Tambahkan paragraf terakhir jika ada
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
    }
    
    // Jika tidak ada paragraf sama sekali, return array kosong
    return paragraphs.length > 0 ? paragraphs : [[]];
}

function testHtmlConversion(htmlString) {
    console.log("🧪 Testing HTML conversion:");
    console.log("Input HTML:", htmlString);
    
    const runs = htmlToDocxRuns(htmlString);
    console.log("Output runs:", runs);
    
    const paragraphs = splitContentIntoParagraphs(runs);
    console.log("Split paragraphs:", paragraphs);
    
    return { runs, paragraphs };
}

// Tambahkan ke console untuk testing
window.testHtmlConversion = testHtmlConversion;


function debugRenderMindMap() {
    console.log('=== DEBUG RENDER START ===');
    
    // 1. Cek container
    const container = document.getElementById('mindmap');
    console.log('1. Container found:', container);
    
    if (!container) {
        console.error('Container #mindmap not found!');
        return;
    }
    
    // 2. Clear container
    container.innerHTML = '';
    console.log('2. Container cleared');
    
    // 3. Get dimensions
    let width = container.clientWidth;
    let height = container.clientHeight;
    console.log('3. Dimensions:', { width, height });
    
    if (width === 0 || height === 0) {
        console.error('Container has no dimensions!');
        // Force dimensions
        width = 800;
        height = 600;
        console.log('Using default dimensions:', { width, height });
    }
    
    // 4. Create SVG
    console.log('4. Creating SVG...');
    const svg = d3.select('#mindmap')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#f0f0f0') // Debug background
        .style('border', '2px solid red'); // Debug border
    
    console.log('5. SVG created:', svg.node());
    
    // 5. Test dengan simple circle
    svg.append('circle')
        .attr('cx', width/2)
        .attr('cy', height/2)
        .attr('r', 50)
        .attr('fill', 'blue');
    
    console.log('6. Test circle added');
    
    // 6. Coba render tree
    if (treeData) {
        console.log('7. Rendering tree data...');
        
        const g = svg.append('g');
        
        const root = d3.hierarchy(treeData);
        console.log('8. Hierarchy created:', root);
        
        const treeLayout = d3.tree().size([height, width - 200]);
        treeLayout(root);
        console.log('9. Tree layout applied');
        
        // Add links
        const links = g.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            )
            .attr('stroke', 'black')
            .attr('fill', 'none');
        
        console.log('10. Links added:', links.size());
        
        // Add nodes
        const nodes = g.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);
        
        nodes.append('circle')
            .attr('r', 20)
            .attr('fill', '#3498db')
            .attr('stroke', '#2c3e50');
        
        nodes.append('text')
            .attr('dy', 4)
            .text(d => d.data.title);
        
        console.log('11. Nodes added:', nodes.size());
    }
    
    console.log('=== DEBUG RENDER END ===');
}


function OLDcreateColorLegend() {
    const legendContainer = d3.select('#mindmap')
        .append('div')
        .attr('class', 'color-legend');
    
    legendContainer.append('div')
        .style('font-weight', 'bold')
        .style('margin-bottom', '8px')
        .text('Level Colors:');
    
    nodeColors.forEach((color, index) => {
        const item = legendContainer.append('div')
            .attr('class', 'color-legend-item');
        
        item.append('div')
            .attr('class', 'color-legend-circle')
            .style('background-color', color.fill)
            .style('border-color', color.stroke);
        
        item.append('span')
            .text(`Level ${index}`);
    });
}

function EXPANDEDDEFAULTcreateColorLegend() {
    // Cek apakah legend sudah ada
    const existingLegend = d3.select('.color-legend');
    if (!existingLegend.empty()) {
        existingLegend.remove();
        return;
    }
    
    const legendContainer = d3.select('#mindmap')
        .append('div')
        .attr('class', 'color-legend')
        .style('cursor', 'pointer');
    
    // Header yang bisa diklik
    const header = legendContainer.append('div')
        .style('font-weight', 'bold')
        .style('margin-bottom', '8px')
        .text('Level Colors ▼');
    
    // Container untuk items
    const itemsContainer = legendContainer.append('div')
        .attr('class', 'legend-items');
    
    // Add color items
    nodeColors.forEach((color, index) => {
        const item = itemsContainer.append('div')
            .attr('class', 'color-legend-item');
        
        item.append('div')
            .attr('class', 'color-legend-circle')
            .style('background-color', color.fill)
            .style('border-color', color.stroke);
        
        item.append('span')
            .text(`Level ${index}`);
    });
    
    // Click handler untuk toggle
    let isExpanded = true;
    header.on('click', function() {
        isExpanded = !isExpanded;
        itemsContainer.style('display', isExpanded ? 'block' : 'none');
        header.text(isExpanded ? 'Level Colors ▼' : 'Level Colors ▶');
    });
}



function createColorLegend() {
    // Cek apakah legend sudah ada
    const existingLegend = d3.select('.color-legend');
    if (!existingLegend.empty()) {
        existingLegend.remove();
        return;
    }
    
    const legendContainer = d3.select('#mindmap')
        .append('div')
        .attr('class', 'color-legend')
        .style('cursor', 'pointer');
    
    // Header yang bisa diklik
    const header = legendContainer.append('div')
        .style('font-weight', 'bold')
        .style('margin-bottom', '8px')
        .text('Level Colors ▶');  // Arrow pointing right (collapsed)
    
    // Container untuk items
    const itemsContainer = legendContainer.append('div')
        .attr('class', 'legend-items')
        .style('display', 'none');  // Hidden by default
    
    // Add color items
    nodeColors.forEach((color, index) => {
        const item = itemsContainer.append('div')
            .attr('class', 'color-legend-item');
        
        item.append('div')
            .attr('class', 'color-legend-circle')
            .style('background-color', color.fill)
            .style('border-color', color.stroke);
        
        item.append('span')
            .text(`Level ${index}`);
    });
    
    // Click handler untuk toggle
    let isExpanded = false;  // Start collapsed
    header.on('click', function() {
        isExpanded = !isExpanded;
        itemsContainer.style('display', isExpanded ? 'block' : 'none');
        header.text(isExpanded ? 'Level Colors ▼' : 'Level Colors ▶');
    });
}


// Fungsi untuk menampilkan help shortcuts
function showShortcutsHelp() {
    const helpText = `
KEYBOARD SHORTCUTS:

File Operations:
• Ctrl + S    : Save As
• Ctrl + N    : New Mind Map

Export:
• Ctrl + E    : Export as TXT
• Ctrl + D    : Export as DOCX

Node Operations:
• Ctrl + A    : Add Child Node
• Delete/Backspace : Delete Selected Node
• F2          : Edit Node Title

Navigation:
• Click       : Select Node
• Double Click: Collapse/Expand Node
• Arrow Keys  : Navigate Between Nodes
  - Left      : Go to Parent
  - Right     : Go to First Child
  - Up        : Previous Sibling
  - Down      : Next Sibling

Other:
• Ctrl + F    : Focus Search Box
• Escape      : Deselect Node / Clear Search
`;
    
    alert(helpText);
}

// Tambah shortcut untuk help
document.addEventListener('keydown', function(event) {
    if (event.key === 'F1') {
        event.preventDefault();
        showShortcutsHelp();
    }
});



// Jalankan debug
debugRenderMindMap();
