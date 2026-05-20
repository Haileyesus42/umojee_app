import axios from 'axios';
import express, { NextFunction, Request, Response } from 'express';

const router = express.Router();

type ForecastEntry = {
  dt_txt?: string;
  main?: {
    temp?: number;
  };
  weather?: Array<{
    main?: string;
    icon?: string;
  }>;
};

router.post('/forecast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const days = Math.min(Math.max(Number(req.body?.days || 3), 1), 5);

    if (!apiKey) {
      return res.status(500).json({ detail: 'OPENWEATHERMAP_API_KEY not configured' });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ detail: 'latitude and longitude are required' });
    }

    const [currentResp, forecastResp] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' },
        timeout: 10000,
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: { lat: latitude, lon: longitude, appid: apiKey, units: 'metric' },
        timeout: 10000,
      }),
    ]);

    const currentWeather = currentResp.data?.weather?.[0] || {};
    const currentMain = currentResp.data?.main || {};
    const currentSys = currentResp.data?.sys || {};
    const hourly = ((forecastResp.data?.list || []) as ForecastEntry[]).slice(0, 4).map((entry) => ({
      time: entry.dt_txt || '',
      condition: entry.weather?.[0]?.main || 'Unknown',
      icon: entry.weather?.[0]?.icon || '01d',
      temp: Math.round(entry.main?.temp || 0),
    }));
    const dailyMap: Record<string, { date: string; condition: string; icon: string; temps: number[] }> = {};

    ((forecastResp.data?.list || []) as ForecastEntry[]).forEach((entry) => {
      const dtTxt = entry.dt_txt || '';
      const date = dtTxt.includes(' ') ? dtTxt.split(' ')[0] : dtTxt.slice(0, 10);

      if (!date) {
        return;
      }

      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          condition: entry.weather?.[0]?.main || 'Unknown',
          icon: entry.weather?.[0]?.icon || '01d',
          temps: [],
        };
      }

      if (typeof entry.main?.temp === 'number') {
        dailyMap[date].temps.push(entry.main.temp);
      }
    });

    const daily = Object.keys(dailyMap)
      .sort()
      .slice(0, days)
      .map((date) => {
        const day = dailyMap[date];

        return {
          date: day.date,
          condition: day.condition,
          icon: day.icon,
          high: day.temps.length ? Math.round(Math.max(...day.temps)) : null,
          low: day.temps.length ? Math.round(Math.min(...day.temps)) : null,
        };
      });

    return res.json({
      city: currentResp.data?.name || null,
      current: {
        condition: currentWeather.main || 'Unknown',
        description: currentWeather.description || '',
        icon: currentWeather.icon || '01d',
        temp: Math.round(currentMain.temp || 0),
        feels_like: Math.round(currentMain.feels_like || 0),
        humidity: currentMain.humidity ?? null,
        sunrise: currentSys.sunrise ?? null,
        sunset: currentSys.sunset ?? null,
        timezone: currentResp.data?.timezone ?? null,
      },
      hourly,
      daily,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
