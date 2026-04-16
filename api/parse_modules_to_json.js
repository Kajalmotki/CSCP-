const fs = require('fs');
const path = require('path');

const TEXT_FILES = [
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module1.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module2.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module3.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module4.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module5.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module6.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module7.txt",
    "C:\\Users\\Siddharth\\Downloads\\cscp2025_module8.txt",
];

const OUTPUT_DIR = "d:\\REVOS-CM-AI\\api\\data";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const filePath of TEXT_FILES) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        continue;
    }
    
    console.log(`Parsing ${filePath}...`);
    
    // Read file
    let text;
    try {
        text = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        text = fs.readFileSync(filePath, 'latin1');
    }
    
    const lines = text.split(/\r?\n/);
    
    let moduleIdMatch = filePath.match(/module(\d+)/i);
    let moduleId = moduleIdMatch ? moduleIdMatch[1] : "unknown";
    let moduleTitle = "Unknown Module Title";
    
    const sections = [];
    let currentSection = { section_title: "Introduction", paragraphs: [] };
    let currentParagraph = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        if (!line) {
            if (currentParagraph.length > 0) {
                let paragraphText = currentParagraph.join(' ').trim();
                if (paragraphText) currentSection.paragraphs.push(paragraphText);
                currentParagraph = [];
            }
            continue;
        }
        
        // Detect Module title
        let mMatch = line.match(/^Module\s+\d+:\s*(.*)/i);
        if (mMatch && moduleTitle === "Unknown Module Title") {
            moduleTitle = line;
            let j = i + 1;
            while (j < lines.length && lines[j].trim() !== "") {
                moduleTitle += " " + lines[j].trim();
                j++;
            }
            continue;
        }
        
        // Detect Section title
        let sMatch = line.match(/^Section\s+[A-Z0-9]+:\s*(.*)/i);
        if (sMatch) {
            if (currentParagraph.length > 0) {
                let paragraphText = currentParagraph.join(' ').trim();
                if (paragraphText) currentSection.paragraphs.push(paragraphText);
                currentParagraph = [];
            }
            
            if (currentSection.paragraphs.length > 0 || currentSection.section_title !== "Introduction") {
                sections.push(currentSection);
            }
            
            currentSection = { section_title: line, paragraphs: [] };
            continue;
        }
        
        currentParagraph.push(line);
    }
    
    if (currentParagraph.length > 0) {
        let paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) currentSection.paragraphs.push(paragraphText);
    }
    
    if (currentSection.paragraphs.length > 0 || currentSection.section_title !== "Introduction") {
        sections.push(currentSection);
    }
    
    const outputData = {
        module_id: moduleId,
        module_title: moduleTitle,
        sections: sections
    };
    
    const outputFile = path.join(OUTPUT_DIR, `cscp2025_module${moduleId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log(`Generated: ${outputFile}`);
}

console.log("Parsing complete!");
