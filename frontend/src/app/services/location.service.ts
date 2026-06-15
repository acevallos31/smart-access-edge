// ============================================================
// LOCATION SERVICE — Geolocalización del registro
// ============================================================
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface Ubicacion {
  lat: number;
  lng: number;
  direccion: string;   // texto legible
  ciudad: string;
  pais: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {

  // ── Obtener posición y revertir a dirección ──────────────────
  obtenerUbicacion(): Observable<Ubicacion> {
    return new Observable<GeolocationPosition>(obs => {
      if (!navigator.geolocation) {
        obs.error('Geolocalización no disponible');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => { obs.next(pos); obs.complete(); },
        err => obs.error(err),
        { timeout: 8000, maximumAge: 60000 }
      );
    }).pipe(
      switchMap(pos => this.revertir(pos.coords.latitude, pos.coords.longitude)),
      catchError(() => of(this.ubicacionDesconocida()))
    );
  }

  private revertir(lat: number, lng: number): Observable<Ubicacion> {
    // Usamos la API gratuita de Nominatim (OpenStreetMap)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
    return from(
      fetch(url, { headers: { 'Accept-Language': 'es' } })
        .then(r => r.json())
        .then(data => {
          const addr = data.address ?? {};
          const partes = [
            addr.road ?? addr.pedestrian ?? '',
            addr.house_number ?? '',
            addr.suburb ?? addr.neighbourhood ?? '',
            addr.city ?? addr.town ?? addr.village ?? ''
          ].filter(Boolean);
          return {
            lat,
            lng,
            direccion: partes.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            ciudad:    addr.city ?? addr.town ?? addr.village ?? 'Ciudad desconocida',
            pais:      addr.country ?? 'Honduras'
          } as Ubicacion;
        })
        .catch(() => this.ubicacionDesconocida(lat, lng))
    );
  }

  private ubicacionDesconocida(lat?: number, lng?: number): Ubicacion {
    return {
      lat:       lat ?? 0,
      lng:       lng ?? 0,
      direccion: lat ? `${lat.toFixed(5)}, ${lng!.toFixed(5)}` : 'Ubicación no disponible',
      ciudad:    'Sin ciudad',
      pais:      'Honduras'
    };
  }
}
