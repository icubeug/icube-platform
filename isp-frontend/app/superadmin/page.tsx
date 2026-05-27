'use client';
import { useEffect } from 'react';
export default function SuperadminIndex() {
  useEffect(() => { window.location.href = '/superadmin/dashboard'; }, []);
  return null;
}
