const graphContainer = document.getElementById('graph-container');
const generateButton = document.getElementById('generate-button');
const axisDescriptionInput = document.getElementById('axis-description');
const copyLinkButton = document.getElementById('copy-link-button');
const loadingIndicator = document.getElementById('loading-indicator');
const examplesList = document.querySelector('.examples ul');

// --- Constants ---
const COLORS = {
    bg: '#1a1a2e',
    text: '#ffffff',
    highlight1: '#00f5a0', // Turquoise
    highlight2: '#00d9ff', // Blue
    highlight3: '#a370f7', // Purple
    plotBg: '#2a2a3e',
};

const PALETTES = [
    [COLORS.highlight1, COLORS.highlight2, COLORS.highlight3],
    ['#ff6b6b', '#feca57', '#48dbfb'], // Red, Yellow, Light Blue
    ['#ff9ff3', '#54a0ff', '#5f27cd'], // Pink, Blue, Dark Purple
];

const EMOJIS = ['🚀', '✨', '🌕', '💰', '📈', '💎', '🦍']; // Added more crypto-bro relevant emojis

const GRAPH_STYLES = [
    { type: 'line', name: 'Line Chart (Linear)', growth: 'linear' },
    { type: 'bar', name: 'Bar Chart (Exponential)', growth: 'exponential' },
    { type: 'histogram', name: 'Stacked Histogram (Hockey)', growth: 'hockey' },
    { type: 'line', name: 'Animated Line (Chaotic)', growth: 'chaotic' },
    { type: 'bar', name: 'Bar Emojis (Linear)', growth: 'linear' },
    { type: 'line', name: 'Line Chart (Exponential)', growth: 'exponential' },
    { type: 'bar', name: 'Bar Chart (Hockey)', growth: 'hockey' },
    { type: 'line', name: 'Animated Line (Linear)', growth: 'exponential' },
];

const NUM_STYLES = GRAPH_STYLES.length; // Updated automatically
const DEFAULT_POINTS = 15; // Number of data points for generated graphs
const FIXED_Y_MAX = 250; // Define a fixed upper limit for the Y-axis here

// --- State ---
let currentStyleIndex = 0;
let currentParsedText = { items: [], timePeriod: null, originalText: '' };
let currentGraphData = [];

// --- Utility Functions ---

// Simple pseudo-random number generator for deterministic results based on seed
function mulberry32(seed) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// --- Core Logic ---

function parseInputText(text) {
    const originalText = text.trim();
    let items = [];
    let timePeriod = null;
    let textForItems = originalText; // Start with the full text

    // 1. Try to find and extract time period first
    const timeRegex = /(last|past)\s+(week|month|quarter|year)|(20\d{2})/i;
    const timeMatch = originalText.match(timeRegex);

    if (timeMatch) {
        timePeriod = timeMatch[0];
        // Remove the found time phrase from the text used for item parsing
        // Use replace to avoid issues if the phrase appears multiple times (though unlikely with this regex)
        textForItems = originalText.replace(timeMatch[0], '').trim();
        // Clean up potential leftover delimiters if time was at start/end
        textForItems = textForItems.replace(/^[,&\/\s]+|[,&\/\s]+$/g, '').trim();
    }

    // 2. Parse the remaining text (or original if no time found) for items
    if (textForItems) {
        // Basic item splitting (handles commas, 'and', '&', '/')
        const parts = textForItems.split(/,|\s+and\s+|\s*&\s*|\s*\/\s*/);
        items = parts.map(item => item.trim()).filter(item => item.length > 0);
    }

    // 3. Default if no items were parsed
    if (items.length === 0) {
        // If there was textForItems but it didn't split well, use it as a single item
        if (textForItems) {
            items = [textForItems];
        } else {
             // If textForItems was empty (e.g., input was just "2024"), use a default
            items = ["My Awesome Metric"];
        }
    }

    return { items, timePeriod, originalText };
}

// Updated to accept styleIndex to determine growth pattern and apply conditional normalization
function generateGraphData(parsedText, seed, styleIndex) {
    const numItems = parsedText.items.length;
    const rawGeneratedData = []; // Store raw data before normalization
    const random = mulberry32(seed); // Use seeded random generator
    const style = GRAPH_STYLES[styleIndex % NUM_STYLES];
    const growthType = style.growth;

    // Generate X values (simple sequence or basic time)
    let xValues = Array.from({ length: DEFAULT_POINTS }, (_, i) => i + 1);
    if (parsedText.timePeriod) {
        // Basic placeholder for time - could be improved
        xValues = Array.from({ length: DEFAULT_POINTS }, (_, i) => `Day ${i + 1}`);
        // If a year like "2023" was found, generate months? Too complex for now.
    }

    // Generate Y values for each item - ensuring upward trend
    for (let i = 0; i < numItems; i++) {
        let yValues = [];
        let currentValue = 10 + random() * 10; // Slightly lower start variation
        const hockeyStickPoint = Math.floor(DEFAULT_POINTS * (0.6 + random() * 0.2)); // Point where hockey stick kicks in

        for (let j = 0; j < DEFAULT_POINTS; j++) {
            // Ensure value is at least 0 or slightly above
            currentValue = Math.max(0.1, currentValue);
            yValues.push(Math.round(currentValue * 10) / 10); // Keep some decimals for smoother curves

            // Calculate next value based on growth type
            let increment = 0;
            switch (growthType) {
                case 'exponential':
                    // Increase by a percentage + small random factor + base upward push
                    increment = currentValue * (0.1 + random() * 0.2) + (random() * 2) + 0.5;
                    break;
                case 'hockey':
                    if (j < hockeyStickPoint) {
                        // Slow growth initially
                        increment = (random() * 1.5) + 0.1;
                    } else {
                        // Sharp increase after hockey stick point
                        increment = (random() * 6) + 3 + (j - hockeyStickPoint) * 0.8;
                    }
                    break;
                case 'chaotic':
                    // More volatile changes, but with upward bias
                    increment = (random() - 0.4) * 10 + 1.5 + (j * 0.1); // Random swing + upward push
                    // Ensure increment isn't too negative to maintain overall upward trend
                    increment = Math.max(increment, -currentValue * 0.1); // Limit downward chaos
                    break;
                case 'linear':
                default:
                    // Steady increase with some randomness + base upward push
                    increment = (random() * 4) + 1 + (j * 0.2);
                    break;
            }
            currentValue += increment;
            // Remove capping during generation
        }

        // Store raw generated yValues
        rawGeneratedData.push({
            x: xValues,
            y: yValues, // Store the raw, unnormalized values first
            name: parsedText.items[i] || `Item ${i+1}`
        });
    }

    // --- Conditional Normalization Step ---
    const isStacked = style.type === 'histogram' && numItems > 1;
    let finalGeneratedData = [];

    if (isStacked) {
        // Normalize based on max sum for stacked charts
        let maxSum = 0;
        for (let j = 0; j < DEFAULT_POINTS; j++) {
            let currentSum = 0;
            for (let i = 0; i < numItems; i++) {
                currentSum += rawGeneratedData[i].y[j] || 0;
            }
            maxSum = Math.max(maxSum, currentSum);
        }

        let globalScaleFactor = 1;
        //if (maxSum > FIXED_Y_MAX) {
            globalScaleFactor = (FIXED_Y_MAX-(random()*10)) / maxSum;
        //}

        // Apply global scale factor to all data
        finalGeneratedData = rawGeneratedData.map(trace => ({
            ...trace,
            y: trace.y.map(y => Math.max(0.1, Math.round(y * globalScaleFactor * 10) / 10))
        }));

    } else {
        // Normalize each trace individually for non-stacked charts
        finalGeneratedData = rawGeneratedData.map(trace => {
            const currentMaxY = Math.max(...trace.y);
            let finalYValues = trace.y;
            //if (currentMaxY > FIXED_Y_MAX) {
                const scaleFactor = (FIXED_Y_MAX-(random()*10)) / currentMaxY;
                finalYValues = trace.y.map(y => Math.max(0.1, Math.round(y * scaleFactor * 10) / 10));
            //}
            return { ...trace, y: finalYValues };
        });
    }
    // --- End Normalization ---

    return finalGeneratedData; // Return the processed data
}

// Helper function to prepare Plotly traces and layout based on data
function preparePlotData(data, styleIndex, parsedText, seed) {
    const style = GRAPH_STYLES[styleIndex % NUM_STYLES];
    const palette = PALETTES[styleIndex % PALETTES.length];
    const random = mulberry32(seed); // Use the same seed for consistency in style choices

    const traces = [];
    // fixedYMax is now a constant FIXED_Y_MAX defined at the top
    const layout = {
        title: `Graph for: ${parsedText.originalText || 'Generated Data'} 🚀`,
        paper_bgcolor: COLORS.bg,
        plot_bgcolor: COLORS.plotBg,
        hovermode: false, // Disable hover text globally
        font: {
            color: COLORS.text,
            family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        },
        xaxis: {
            title: parsedText.timePeriod || 'Period',
            gridcolor: 'rgba(255, 255, 255, 0.05)', // Fainter grid lines
            showticklabels: false, // Hide individual labels on X-axis
            zeroline: false // Hide zero line
        },
        yaxis: {
            // Set title only if there's one trace (no legend shown by default)
            title: data.length === 1 ? (parsedText.items.length === 1 ? parsedText.items[0] : (parsedText.originalText || 'Values')) : '',
            gridcolor: 'rgba(255, 255, 255, 0.05)', // Fainter grid lines
            showticklabels: false, // Hide numeric labels on Y-axis
            zeroline: false, // Hide zero line
            range: [0, FIXED_Y_MAX] // Use the constant for fixed Y-axis range
        },
        legend: {
            bgcolor: 'rgba(0,0,0,0.3)',
            bordercolor: COLORS.highlight2,
            borderwidth: 1
        },
        margin: { l: 50, r: 30, b: 50, t: 80, pad: 4 }
    };

    let annotations = []; // For emojis

    data.forEach((itemData, index) => {
        const trace = {
            x: itemData.x,
            y: itemData.y,
            name: itemData.name,
            marker: { color: palette[index % palette.length] },
            line: { color: palette[index % palette.length], width: 3 },
            hoverinfo: 'none' // Also disable hover info per trace just in case
        };

        switch (style.type) {
            case 'line':
            case 'line_animated':
                trace.type = 'scatter';
                trace.mode = 'lines+markers';
                trace.marker.size = 8;
                break;
            case 'bar':
            case 'bar_emojis':
                trace.type = 'bar';
                layout.barmode = 'group'; // Ensure bars are grouped (default, but explicit)
                break;
            case 'histogram': // Treat as stacked bar if multiple items
                trace.type = 'bar';
                if (data.length > 1) {
                    layout.barmode = 'stack';
                }
                break;
        }

        traces.push(trace);

        // Add emojis for specific style - Now iterates through all points
        if (style.type === 'bar_emojis' && itemData.y.length > 0) {
             // Loop through each data point in the trace
             for(let k = 0; k < itemData.x.length; k++) {
                 annotations.push({
                    x: itemData.x[k],
                    y: itemData.y[k], // Position annotation at the top of the bar
                    text: EMOJIS[Math.floor(random() * EMOJIS.length)], // Random emoji for each bar
                    showarrow: false,
                    font: { size: 16 + random() * 8 }, // Slightly random size
                    yshift: 15 // Shift emoji consistently above the bar
                 });
             }
        }
    });

    layout.annotations = annotations; // Add annotations to layout
    return { traces, layout }; // Return prepared objects
}

// Simplified renderGraph - now only handles initial drawing or errors
function renderGraph(data, plotData) {
     if (!data || data.length === 0) {
        graphContainer.innerHTML = '<p style="text-align: center; padding-top: 50px;">Enter description and click Generate!</p>';
        loadingIndicator.style.display = 'none'; // Ensure loader is hidden
        return;
    }
     // Use Plotly.react for the initial drawing without animation
     Plotly.react(graphContainer, plotData.traces, plotData.layout).then(() => {
        loadingIndicator.style.display = 'none'; // Hide indicator after initial plot
    }).catch(err => {
         console.error("Plotly initial react failed:", err);
         loadingIndicator.style.display = 'none'; // Ensure indicator is hidden on error
    });
}


function updateURL(styleIndex, text, seed) {
    const params = new URLSearchParams();
    params.set('style', styleIndex);
    params.set('text', text);
    params.set('seed', seed); // Include seed in URL
    // Use replaceState to avoid bloating browser history on repeated clicks
    history.replaceState(null, '', `?${params.toString()}`);
}

function parseURL() {
    const params = new URLSearchParams(window.location.search);
    const style = params.get('style');
    const text = params.get('text');
    const seed = params.get('seed');

    if (text) {
        axisDescriptionInput.value = text;
        currentStyleIndex = parseInt(style || '0', 10);
        const currentSeed = parseInt(seed || Date.now(), 10); // Use saved seed or timestamp

        // Trigger generation based on URL params
        currentParsedText = parseInputText(text);
        // Pass style index to generate correct growth pattern
        currentGraphData = generateGraphData(currentParsedText, currentSeed, currentStyleIndex); // Generate initial data
        const initialPlotData = preparePlotData(currentGraphData, currentStyleIndex, currentParsedText, currentSeed); // Prepare plot objects
        renderGraph(currentGraphData, initialPlotData); // Call simplified initial render
        // No need to update URL here, we just read from it
    } else {
        // Initial empty state
         graphContainer.innerHTML = '<p style="text-align: center; padding-top: 50px;">Enter description and click Generate!</p>';
    }
}

// --- Event Listeners ---

generateButton.addEventListener('click', () => {
    const inputText = axisDescriptionInput.value;
    currentStyleIndex++; // Cycle to next style
    const seed = Date.now(); // Generate a new seed for this generation

    // Show loading indicator
    loadingIndicator.style.display = 'flex';

    // Use setTimeout to allow UI to update before heavy processing
    setTimeout(() => {
        // Generate NEW data and prepare plot objects
        currentParsedText = parseInputText(inputText);
        const newData = generateGraphData(currentParsedText, seed, currentStyleIndex);
        // Ensure newData is valid before proceeding
        if (!newData || newData.length === 0) {
            console.error("Generated data is empty or invalid.");
            loadingIndicator.style.display = 'none';
            // Optionally display an error message to the user in the graph container
            graphContainer.innerHTML = '<p style="text-align: center; color: red; padding-top: 50px;">Error generating graph data!</p>';
            return;
        }
        const newPlotData = preparePlotData(newData, currentStyleIndex, currentParsedText, seed);

        // Check if a graph already exists to animate from
        const plotExists = graphContainer.querySelector('.plot-container') !== null;
        const animationDuration = 600; // ms - Increased for slower animation

        if (plotExists && currentGraphData.length > 0) {
            // --- Stage 1: Animate Old Graph Down ---
            // Prepare plot data for the *current* graph state before update
            // Note: Re-preparing old state might slightly differ if random elements were in layout,
            // but using currentGraphData is the most reliable source.
            // We need the *trace structure* of the old data.
             const oldTraces = currentGraphData.map((traceData, index) => {
                 // Reconstruct a basic trace object (type might be needed if changing types)
                 const oldStyleIndex = (currentStyleIndex -1 + NUM_STYLES) % NUM_STYLES; // Get previous style index
                 const oldStyle = GRAPH_STYLES[oldStyleIndex];
                 let traceType = 'scatter'; // Default
                 switch(oldStyle.type) {
                    case 'bar': case 'histogram': case 'bar_emojis': traceType = 'bar'; break;
                    case 'line': case 'line_animated': traceType = 'scatter'; break;
                 }
                 return { type: traceType, x: traceData.x, y: traceData.y };
             });


            // Create zeroed version of OLD traces
            const zeroedOldTraces = oldTraces.map(trace => ({
                ...trace, // Keep basic structure (like type)
                y: trace.y.map(() => 0.1) // Target y = 0.1
            }));

            Plotly.animate(graphContainer, {
                data: zeroedOldTraces, // Animate existing traces down to zeroed data
                // Use the NEW layout immediately for a smoother transition of axes/titles if they change
                layout: newPlotData.layout
            }, {
                transition: { duration: animationDuration, easing: 'linear' },
                frame: { duration: animationDuration, redraw: true }
            }).then(() => {
                // --- Stage 2: Draw New Graph at Zero and Animate Up ---
                // Create zeroed version of NEW traces
                const zeroedNewTraces = newPlotData.traces.map(trace => ({
                    ...trace, // Use the full new trace structure
                    y: trace.y.map(() => 0.1)
                }));

                // Instantly redraw with new structure/layout but zeroed data using react
                return Plotly.react(graphContainer, zeroedNewTraces, newPlotData.layout);
            }).then(() => {
                 // Now animate the zeroed new graph up to its final values
                return Plotly.animate(graphContainer, {
                    data: newPlotData.traces, // Target: final new data traces
                    layout: newPlotData.layout // Ensure layout is final
                }, {
                    transition: { duration: animationDuration * 1.5, easing: 'cubic-out' }, // Slightly longer rise
                    frame: { duration: animationDuration * 1.5, redraw: true }
                });
            }).then(() => {
                // --- Final Cleanup ---
                currentGraphData = newData; // Update state *after* successful animation
                updateURL(currentStyleIndex, inputText, seed);
                loadingIndicator.style.display = 'none';
            }).catch(err => {
                console.error("Drop/Raise animation failed:", err);
                // Fallback to simple render on error
                const finalPlotData = preparePlotData(newData, currentStyleIndex, currentParsedText, seed);
                Plotly.react(graphContainer, finalPlotData.traces, finalPlotData.layout).then(()=> {
                   loadingIndicator.style.display = 'none';
                });
                currentGraphData = newData; // Still update state on fallback
                updateURL(currentStyleIndex, inputText, seed);
            });

        } else {
            // First plot or no previous data, just draw it directly using renderGraph
            renderGraph(newData, newPlotData); // Use the simplified initial render
            currentGraphData = newData; // Update state
            updateURL(currentStyleIndex, inputText, seed);
            // renderGraph hides the loader internally
        }

    }, 10); // Small delay
});

// Listener for clickable examples
if (examplesList) {
    examplesList.addEventListener('click', (event) => {
        if (event.target.tagName === 'LI' && event.target.dataset.example) {
            axisDescriptionInput.value = event.target.dataset.example;
            // Optionally trigger generation immediately
            generateButton.click();
        }
    });
}

// Listener for copy link button
if (copyLinkButton) {
    copyLinkButton.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            // Visual feedback
            const originalText = copyLinkButton.innerHTML;
            copyLinkButton.innerHTML = 'Copied! ✅';
            copyLinkButton.disabled = true;
            setTimeout(() => {
                copyLinkButton.innerHTML = originalText;
                copyLinkButton.disabled = false;
            }, 1500); // Reset after 1.5 seconds
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            // Optional: Show an error message to the user
        });
    });
};

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    parseURL(); // Check URL parameters on load
});
