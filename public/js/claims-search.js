// Claims search functionality
function updateResults(url) {
    // Add base path if not present
    if (!url.startsWith('/claims/search')) {
        url = '/claims/search' + (url.startsWith('?') ? url : `?${url}`);
    }

    fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const resultsDiv = document.querySelector('.results');
        let html = '';
        
        if (data.claims.length > 0) {
            html = `
                <h3>Search Results</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Claim Number</th>
                            <th>MVA</th>
                            <th>Customer Name</th>
                            <th>VIN</th>
                            <th>Damage Type</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.claims.map(claim => `
                            <tr>
                                <td>${claim.claimNumber}</td>
                                <td>${claim.mva || ''}</td>
                                <td>${claim.customerName || ''}</td>
                                <td>${claim.carVIN || ''}</td>
                                <td>${(claim.damageType || []).join(', ')}</td>
                                <td>${claim.status?.name || 'Unknown Status'}</td>
                                <td>${new Date(claim.date).toLocaleDateString()}</td>
                                <td>
                                    <a href="/claims/${claim._id}" class="btn">View</a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="pagination">
                    <div class="pagination-info">
                        Showing ${((data.page - 1) * data.resultsPerPage) + 1} to ${Math.min(data.page * data.resultsPerPage, data.totalClaims)} of ${data.totalClaims} claims
                    </div>
                    ${data.totalPages > 1 ? `
                        <div class="pagination-controls">
                            ${generatePaginationControls(data)}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            html = '<p>No claims found.</p>';
        }
        
        resultsDiv.innerHTML = html;
        window.history.pushState({}, '', url);
    })
    .catch(error => {
        console.error('Error fetching results:', error);
    });
}

function generatePaginationControls(data) {
    const { page, totalPages, resultsPerPage, queryString } = data;
    let controls = '';

    if (page > 1) {
        controls += `<button data-page="${page - 1}" class="pagination-btn pagination-link">&laquo; Previous</button>`;
    } else {
        controls += `<button class="pagination-btn disabled">&laquo; Previous</button>`;
    }

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        controls += `<button data-page="1" class="pagination-btn pagination-link">1</button>`;
        if (startPage > 2) {
            controls += `<span>...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        controls += `<button data-page="${i}" class="pagination-btn pagination-link ${i === page ? 'active' : ''}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            controls += `<span>...</span>`;
        }
        controls += `<button data-page="${totalPages}" class="pagination-btn pagination-link">${totalPages}</button>`;
    }

    if (page < totalPages) {
        controls += `<button data-page="${page + 1}" class="pagination-btn pagination-link">Next &raquo;</button>`;
    } else {
        controls += `<button class="pagination-btn disabled">Next &raquo;</button>`;
    }

    return controls;
}

function clearFilters() {
    // Get the form
    const form = document.querySelector('.search-form');
    
    // Clear all text inputs
    form.querySelectorAll('input[type="text"]').forEach(input => {
        input.value = '';
    });
    
    // Clear all date inputs
    form.querySelectorAll('input[type="date"]').forEach(input => {
        input.value = '';
    });
    
    // Clear multiple selects
    form.querySelectorAll('select[multiple]').forEach(select => {
        Array.from(select.options).forEach(option => {
            option.selected = false;
        });
    });
    
    // Reset results per page to default (10)
    const resultsPerPage = document.getElementById('resultsPerPage');
    resultsPerPage.value = '10';
    
    // Trigger a new search with cleared filters
    updateResults('?resultsPerPage=10');
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission
    document.querySelector('.search-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const queryString = new URLSearchParams(formData).toString();
        updateResults(`?${queryString}`);
    });

    // Handle results per page change
    document.getElementById('resultsPerPage').addEventListener('change', function() {
        const formData = new FormData(document.querySelector('.search-form'));
        const queryString = new URLSearchParams(formData).toString();
        updateResults(`?${queryString}`);
    });

    // Handle pagination clicks using event delegation
    document.addEventListener('click', function(e) {
        if (e.target.matches('.pagination-link')) {
            e.preventDefault();
            const page = e.target.dataset.page;
            const resultsPerPage = document.getElementById('resultsPerPage').value;
            const formData = new FormData(document.querySelector('.search-form'));
            const searchParams = new URLSearchParams(formData);
            searchParams.set('page', page);
            searchParams.set('resultsPerPage', resultsPerPage);
            updateResults(`?${searchParams.toString()}`);
        }
    });

    // Add clear filters button handler
    document.getElementById('clearFilters').addEventListener('click', clearFilters);

    // Add handlers for clearing individual multiple selects
    document.querySelectorAll('select[multiple]').forEach(select => {
        select.addEventListener('mousedown', function(e) {
            const option = e.target;
            if (option.classList.contains('clear-option')) {
                e.preventDefault();
                Array.from(this.options).forEach(opt => {
                    if (!opt.classList.contains('clear-option')) {
                        opt.selected = false;
                    }
                });
                // Trigger change event
                this.dispatchEvent(new Event('change'));
            }
        });
    });
}); 