import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import App from '../App';

const mockAuthSession = {
  isAuthenticated: false,
  loading: false,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  logout: jest.fn(),
  message: null,
  register: jest.fn(),
  registerWithGoogle: jest.fn(),
  restoreSession: jest.fn(),
  status: 'idle',
  token: null,
  updateUser: jest.fn(),
  user: null,
};

jest.mock('../src/hooks/auth/useAuthSession', () => ({
  useAuthSession: jest.fn(() => mockAuthSession),
}));

jest.mock('../src/hooks/useCurrentWeather', () => ({
  useCurrentWeather: jest.fn(() => ({
    error: null,
    loading: false,
    refreshWeather: jest.fn(),
    setCachedWeatherMode: jest.fn(),
    weather: null,
    weatherMode: 'sunny',
  })),
}));

jest.mock('../src/api/notifications', () => ({
  fetchJourneyNotifications: jest.fn(async () => []),
  fetchUserJourneys: jest.fn(async () => []),
  markJourneyNotificationsSeen: jest.fn(async () => undefined),
}));

describe('App', () => {
  beforeEach(() => {
    Object.assign(mockAuthSession, {
      isAuthenticated: false,
      loading: false,
      message: null,
      status: 'idle',
      token: null,
      user: null,
    });
    jest.clearAllMocks();
  });

  it('renders the intro video before the homepage', () => {
    render(<App />);

    expect(screen.getByLabelText('Umojee intro video')).toBeTruthy();
  });

  it('renders the homepage from the shared background shell for a restored session', async () => {
    Object.assign(mockAuthSession, {
      isAuthenticated: true,
      token: 'test-token',
      user: {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Open chat to plan where to go today')).toBeTruthy();
    });
    expect(screen.getByText('Hi!')).toBeTruthy();
    expect(screen.getByText('Monthly Spending Total')).toBeTruthy();
    expect(screen.getByText('$205.00')).toBeTruthy();
    expect(screen.getByLabelText('Weather summary')).toBeTruthy();
    expect(screen.getAllByText('My Itinerary').length).toBeGreaterThan(0);
  });

  it('reveals the itinerary details section from the see details control', async () => {
    Object.assign(mockAuthSession, {
      isAuthenticated: true,
      token: 'test-token',
      user: {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByLabelText('See itinerary details').length).toBeGreaterThan(0);
    });

    fireEvent.press(screen.getAllByLabelText('See itinerary details')[0]);

    expect(screen.getByText('Departure & Arrival')).toBeTruthy();
    expect(screen.getByText('Departure: John F. Kennedy International Airport (JFK)')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('See category details'));

    expect(screen.getByText('Hotel Address:')).toBeTruthy();
  });
});
