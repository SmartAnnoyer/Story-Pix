import { renderTemplate } from '../utils/template.util';

describe('template.util', () => {
  it('renders only allowed variables', () => {
    const result = renderTemplate(
      'Hello {{firstName}}, pay {{amount}}',
      { firstName: 'Alex', amount: '999', injected: 'bad' },
      ['firstName', 'amount'],
    );

    expect(result).toBe('Hello Alex, pay 999');
  });
});
