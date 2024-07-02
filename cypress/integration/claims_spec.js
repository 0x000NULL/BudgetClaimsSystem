describe('Claims Page', () => {
    it('should load the claims page', () => {
      cy.visit('/claims/search');
      cy.contains('Search Claims');
    });
  
    it('should add a new claim', () => {
      cy.visit('/claims/add');
      cy.get('input[name="mva"]').type('100');
      cy.get('input[name="customerName"]').type('John Doe');
      cy.get('button[type="submit"]').click();
      cy.contains('Claim added successfully');
    });
  });
  