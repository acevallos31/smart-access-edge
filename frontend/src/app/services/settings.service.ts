import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppSettings {
  enableFaceVerificationTPU: boolean;
  strictFaceVerification: boolean;
  tpuServerUrl: string;
  photoStorageEnabled: boolean;
  theme: 'light' | 'dark';
}

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private readonly STORAGE_KEY = 'sae_settings';
  private readonly DEFAULT_SETTINGS: AppSettings = {
    enableFaceVerificationTPU: true,
    strictFaceVerification: false,
    tpuServerUrl: 'https://inference-api.nocpbx.com',
    photoStorageEnabled: true,
    theme: 'light'
  };

  private settingsSubject = new BehaviorSubject<AppSettings>(this.cargarODefecto());

  constructor() {}

  get settings(): AppSettings {
    return this.settingsSubject.getValue();
  }

  get settings$(): Observable<AppSettings> {
    return this.settingsSubject.asObservable();
  }

  /**
   * Obtiene la configuración actual
   */
  obtenerConfiguracion(): AppSettings {
    return this.settingsSubject.getValue();
  }

  /**
   * Actualiza una o más configuraciones
   */
  actualizarConfiguracion(updates: Partial<AppSettings>): void {
    const nuevaConfig = { ...this.settingsSubject.getValue(), ...updates };
    this.guardarConfiguracion(nuevaConfig);
  }

  /**
   * Activa/desactiva verificación facial TPU
   */
  toggleFaceVerificationTPU(enabled: boolean): void {
    this.actualizarConfiguracion({ enableFaceVerificationTPU: enabled });
  }

  toggleStrictFaceVerification(enabled: boolean): void {
    this.actualizarConfiguracion({ strictFaceVerification: enabled });
  }

  /**
   * Cambia el servidor TPU
   */
  cambiarServidorTPU(url: string): void {
    this.actualizarConfiguracion({ tpuServerUrl: url });
  }

  /**
   * Reinicia configuración a valores por defecto
   */
  reiniciarConfiguracion(): void {
    this.guardarConfiguracion(this.DEFAULT_SETTINGS);
  }

  /**
   * Obtiene solo el estado de TPU
   */
  get tpuHabilitado(): boolean {
    return this.settingsSubject.getValue().enableFaceVerificationTPU;
  }

  /**
   * Obtiene solo la URL del servidor TPU
   */
  get urlServidorTPU(): string {
    return this.settingsSubject.getValue().tpuServerUrl;
  }

  get strictFaceVerification(): boolean {
    return this.settingsSubject.getValue().strictFaceVerification;
  }

  private guardarConfiguracion(config: AppSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      this.settingsSubject.next(config);
    } catch (err) {
      console.error('Error guardando configuración:', err);
    }
  }

  private cargarODefecto(): AppSettings {
    try {
      const guardado = localStorage.getItem(this.STORAGE_KEY);
      if (guardado) {
        return { ...this.DEFAULT_SETTINGS, ...JSON.parse(guardado) };
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
    return this.DEFAULT_SETTINGS;
  }
}
