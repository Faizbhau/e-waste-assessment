/**
 * Dashboard JavaScript for E-Waste Quality Assessment application
 */

// Global variables
let assessmentsData = [];
let componentTypes = new Set();
let componentDistributionChart = null;
let reusabilityChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardData();
    
    // Set up event listeners for filters
    setupFilterListeners();
});

// Function to load dashboard data
function loadDashboardData() {
    // Show loading state
    const tableBody = document.getElementById('assessments-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Loading data...</td></tr>';
    
    // Fetch assessments data
    fetch('/api/assessments')
        .then(response => response.json())
        .then(data => {
            assessmentsData = data;
            
            // Extract unique component types
            componentTypes = new Set(data.map(item => item.component_type));
            
            // Populate component type filter
            populateComponentFilter(componentTypes);
            
            // Render table
            renderAssessmentsTable(data);
            
            // Fetch statistics
            return fetch('/api/stats');
        })
        .then(response => response.json())
        .then(stats => {
            // Update dashboard statistics
            updateDashboardStats(stats);
            
            // Render charts
            renderCharts(stats);
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading data: ${error.message}</td></tr>`;
        });
}

// Function to populate component type filter
function populateComponentFilter(componentTypes) {
    const filterSelect = document.getElementById('filter-component');
    
    // Clear existing options (except the first one)
    while (filterSelect.options.length > 1) {
        filterSelect.remove(1);
    }
    
    // Add component types as options
    componentTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterSelect.appendChild(option);
    });
}

// Function to set up filter listeners
function setupFilterListeners() {
    // Get filter elements
    const componentFilter = document.getElementById('filter-component');
    const qualityFilter = document.getElementById('filter-quality');
    const reusableFilter = document.getElementById('filter-reusable');
    const sortBy = document.getElementById('sort-by');
    
    // Add change event listeners
    const filters = [componentFilter, qualityFilter, reusableFilter, sortBy];
    filters.forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
        }
    });
}

// Function to apply filters and render table
function applyFilters() {
    // Get filter values
    const componentType = document.getElementById('filter-component').value;
    const minQuality = document.getElementById('filter-quality').value;
    const reusable = document.getElementById('filter-reusable').value;
    const sortBy = document.getElementById('sort-by').value;
    
    // Show loading state
    const tableBody = document.getElementById('assessments-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div> Filtering data...</td></tr>';
    
    // Build query string
    let queryParams = new URLSearchParams();
    if (componentType) queryParams.append('component_type', componentType);
    if (minQuality) queryParams.append('min_quality', minQuality);
    if (reusable) queryParams.append('reusable', reusable);
    if (sortBy) {
        queryParams.append('sort_by', sortBy);
        queryParams.append('sort_order', sortBy === 'quality_score' ? 'desc' : 'desc');
    }
    
    // Fetch filtered data
    fetch(`/api/assessments?${queryParams.toString()}`)
        .then(response => response.json())
        .then(data => {
            // Render filtered table
            renderAssessmentsTable(data);
        })
        .catch(error => {
            console.error('Error applying filters:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error filtering data: ${error.message}</td></tr>`;
        });
}

// Function to render assessments table
function renderAssessmentsTable(assessments) {
    const tableBody = document.getElementById('assessments-table-body');
    const noDataMessage = document.getElementById('no-data-message');
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Handle no data case
    if (assessments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No assessments found matching the selected filters.</td></tr>';
        noDataMessage.classList.remove('d-none');
        return;
    }
    
    // Hide no data message
    noDataMessage.classList.add('d-none');
    
    // Render each assessment
    assessments.forEach(assessment => {
        const row = document.createElement('tr');
        
        // Create quality badge class based on score
        let qualityBadgeClass = 'bg-danger';
        if (assessment.quality_score >= 0.7) {
            qualityBadgeClass = 'bg-success';
        } else if (assessment.quality_score >= 0.4) {
            qualityBadgeClass = 'bg-warning';
        }
        
        // Create reusable badge
        const reusableBadge = assessment.reusable ? 
            '<span class="badge bg-success">Yes</span>' : 
            '<span class="badge bg-danger">No</span>';
        
        // Create row HTML
        row.innerHTML = `
            <td>${assessment.id}</td>
            <td>${assessment.component_type}</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="progress flex-grow-1 me-2" style="height: 10px;">
                        <div class="progress-bar ${qualityBadgeClass}" role="progressbar" 
                             style="width: ${assessment.quality_score * 100}%;" 
                             aria-valuenow="${assessment.quality_score * 100}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <span>${(assessment.quality_score * 100).toFixed(1)}%</span>
                </div>
            </td>
            <td>${reusableBadge}</td>
            <td>${(assessment.confidence * 100).toFixed(1)}%</td>
            <td>${assessment.assessment_date}</td>
            <td>
                <a href="/results/${assessment.id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                </a>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to update dashboard statistics
function updateDashboardStats(stats) {
    // Update total assessments
    document.getElementById('total-assessments').textContent = stats.total_assessments;
    
    // Update reusable count
    document.getElementById('reusable-count').textContent = stats.reusability.reusable;
    
    // Update non-reusable count
    document.getElementById('non-reusable-count').textContent = stats.reusability.non_reusable;
    
    // Update average quality
    // Calculate overall average from component averages
    let totalQuality = 0;
    let componentCount = 0;
    
    for (const component in stats.average_quality) {
        totalQuality += stats.average_quality[component];
        componentCount++;
    }
    
    const avgQuality = componentCount > 0 ? totalQuality / componentCount : 0;
    document.getElementById('avg-quality').textContent = (avgQuality * 100).toFixed(1) + '%';
}

// Function to render charts
function renderCharts(stats) {
    // Component distribution chart
    renderComponentDistributionChart(stats);
    
    // Reusability chart
    renderReusabilityChart(stats);
}

// Function to render component distribution chart
function renderComponentDistributionChart(stats) {
    const ctx = document.getElementById('component-distribution-chart').getContext('2d');
    
    // Extract data for chart
    const componentTypes = Object.keys(stats.component_type_counts);
    const componentCounts = Object.values(stats.component_type_counts);
    
    // Generate colors
    const backgroundColors = generateChartColors(componentTypes.length);
    
    // Destroy previous chart if it exists
    if (componentDistributionChart) {
        componentDistributionChart.destroy();
    }
    
    // Create new chart
    componentDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: componentTypes,
            datasets: [{
                label: 'Components Assessed',
                data: componentCounts,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} components (${((context.parsed.y / stats.total_assessments) * 100).toFixed(1)}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Components'
                    }
                }
            }
        }
    });
}

// Function to render reusability chart
function renderReusabilityChart(stats) {
    const ctx = document.getElementById('reusability-chart').getContext('2d');
    
    // Extract data for chart
    const reusabilityData = [
        stats.reusability.reusable,
        stats.reusability.non_reusable
    ];
    
    // Destroy previous chart if it exists
    if (reusabilityChart) {
        reusabilityChart.destroy();
    }
    
    // Create new chart
    reusabilityChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Reusable', 'Non-Reusable'],
            datasets: [{
                data: reusabilityData,
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',   // Green for reusable
                    'rgba(220, 53, 69, 0.7)'    // Red for non-reusable
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = reusabilityData.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Helper function to generate chart colors
function generateChartColors(count) {
    const colors = [
        'rgba(54, 162, 235, 0.7)',    // Blue
        'rgba(255, 99, 132, 0.7)',    // Red
        'rgba(255, 206, 86, 0.7)',    // Yellow
        'rgba(75, 192, 192, 0.7)',    // Green
        'rgba(153, 102, 255, 0.7)',   // Purple
        'rgba(255, 159, 64, 0.7)',    // Orange
        'rgba(199, 199, 199, 0.7)',   // Gray
        'rgba(83, 102, 255, 0.7)',    // Indigo
        'rgba(40, 167, 69, 0.7)',     // Forest Green
        'rgba(220, 53, 69, 0.7)',     // Crimson
    ];
    
    // If more colors needed, generate them
    const result = [];
    for (let i = 0; i < count; i++) {
        if (i < colors.length) {
            result.push(colors[i]);
        } else {
            // Generate random colors if we run out of predefined colors
            const r = Math.floor(Math.random() * 255);
            const g = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 255);
            result.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
        }
    }
    
    return result;
}
