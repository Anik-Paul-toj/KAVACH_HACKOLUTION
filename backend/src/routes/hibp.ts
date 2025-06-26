import { Router } from 'express';
import breaches from '../data/breaches.json';

const router = Router();

// Check if email is pwned
router.get('/email/:email', (req, res) => {
  const email = req.params.email.toLowerCase();
  const found = breaches.filter(breach =>
    breach.emails.map((e: string) => e.toLowerCase()).includes(email)
  );
  if (found.length > 0) {
    res.json({ pwned: true, breaches: found });
  } else {
    res.json({ pwned: false, breaches: [] });
  }
});

// List all breaches
router.get('/breaches', (req, res) => {
  res.json(breaches.map(({ emails, ...rest }) => rest));
});

export default router; 