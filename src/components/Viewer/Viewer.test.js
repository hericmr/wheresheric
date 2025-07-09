import { render, screen, waitFor } from '@testing-library/react';
import Viewer from './index';
import { supabase } from '../../supabaseClient';
import { cityCameras } from '../../cityCameras';
import { calculateDistance } from '../../utils/calculateDistance';

// Mock supabase and calculateDistance
jest.mock('../../supabaseClient', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  },
}));

jest.mock('../../utils/calculateDistance');

describe('Viewer Component - Proximity Feature', () => {
  beforeEach(() => {
    // Reset mocks before each test
    supabase.channel.mockClear();
    calculateDistance.mockClear();
  });

  test('should display FullScreenImage when Heric is in proximity of a camera', async () => {
    // Mock calculateDistance to return a distance within the threshold
    calculateDistance.mockReturnValue(10); // 10 meters, which is < PROXIMITY_THRESHOLD (50m)

    // Mock initial location data from Supabase
    supabase.channel().on().subscribe.mockImplementationOnce((callback) => {
      callback({ new: { lat: cityCameras[0].lat, lng: cityCameras[0].lng, created_at: new Date().toISOString() } });
    });

    render(<Viewer />);

    // Wait for the FullScreenImage to appear
    await waitFor(() => {
      expect(screen.getByAltText(cityCameras[0].name)).toBeInTheDocument();
    });

    // Assert that the FullScreenImage is displayed with the correct image URL and title
    const fullScreenImage = screen.getByAltText(cityCameras[0].name);
    expect(fullScreenImage).toHaveAttribute('src', cityCameras[0].link);
  });

  test('should not display FullScreenImage when Heric is not in proximity of any camera', async () => {
    // Mock calculateDistance to return a distance outside the threshold
    calculateDistance.mockReturnValue(100); // 100 meters, which is > PROXIMITY_THRESHOLD (50m)

    // Mock initial location data from Supabase
    supabase.channel().on().subscribe.mockImplementationOnce((callback) => {
      callback({ new: { lat: 0, lng: 0, created_at: new Date().toISOString() } });
    });

    render(<Viewer />);

    // Assert that the FullScreenImage is NOT displayed
    await waitFor(() => {
      expect(screen.queryByAltText(/Câmera/i)).not.toBeInTheDocument();
    }, { timeout: 2000 }); // Increased timeout for assertion
  });
});
