export interface Scenario {
  id: string
  title: string
  prompt: string
  context: string
}

/** Original example passages written for this project. Fictional policies, not real companies. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'refund',
    title: 'Refund policy (support bot)',
    prompt: 'How long do customers have to request a refund, and where is the money sent?',
    context:
      'Customers may request a refund within 30 days of purchase. Approved refunds are issued to the original payment method within 5 business days. Digital gift cards are not refundable. Refund requests are made through the help center form.',
  },
  {
    id: 'ratelimit',
    title: 'API rate limits (developer docs)',
    prompt: 'What are the API rate limits for the free plan and what happens when I exceed them?',
    context:
      'The free plan allows 60 requests per minute and 5000 requests per day. When a limit is exceeded the API returns HTTP 429 and a Retry-After header. Paid plans allow 600 requests per minute. Limits reset at midnight UTC.',
  },
  {
    id: 'baggage',
    title: 'Baggage allowance (travel assistant)',
    prompt: 'How much checked baggage can an economy passenger bring?',
    context:
      'Economy passengers may check one bag of up to 23 kilograms at no charge. A second checked bag costs 60 dollars. Bags over 23 kilograms and up to 32 kilograms incur an overweight fee of 75 dollars. Sports equipment is accepted as checked baggage.',
  },
]
