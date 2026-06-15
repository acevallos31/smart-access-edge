// ============================================================
// STORAGE SERVICE — Persistencia local con localStorage
// Cuando integres Firebase, reemplaza cada método con la
// versión MODO REAL comentada dentro de cada uno.
// ============================================================
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Employee, AttendanceRecord } from '../models/models';

const KEYS = {
  EMPLEADOS:   'sae_empleados',
  REGISTROS:   'sae_registros',
  FOTO_PREFIX: 'sae_foto_',   // sae_foto_<uid>
};

@Injectable({ providedIn: 'root' })
export class StorageService {

  // ════════════════════════════════════════════════════════════
  // EMPLEADOS
  // ════════════════════════════════════════════════════════════

  getEmpleados(): Employee[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.EMPLEADOS) ?? '[]');
    } catch { return []; }
  }

  saveEmpleados(lista: Employee[]): void {
    localStorage.setItem(KEYS.EMPLEADOS, JSON.stringify(lista));
  }

  upsertEmpleado(emp: Employee): void {
    const lista = this.getEmpleados();
    const idx = lista.findIndex(e => e.id === emp.id);
    if (idx >= 0) lista[idx] = emp; else lista.push(emp);
    this.saveEmpleados(lista);

    /* ── MODO REAL (Firebase Firestore) ───────────────────────
    // import { doc, setDoc, updateDoc } from 'firebase/firestore';
    // await setDoc(doc(db, 'empleados', emp.id), emp, { merge: true });
    ────────────────────────────────────────────────────────── */
  }

  eliminarEmpleado(id: string): void {
    this.saveEmpleados(this.getEmpleados().filter(e => e.id !== id));

    /* ── MODO REAL ────────────────────────────────────────────
    // import { doc, deleteDoc } from 'firebase/firestore';
    // await deleteDoc(doc(db, 'empleados', id));
    ────────────────────────────────────────────────────────── */
  }

  // ════════════════════════════════════════════════════════════
  // REGISTROS DE ASISTENCIA
  // ════════════════════════════════════════════════════════════

  getRegistros(): AttendanceRecord[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.REGISTROS) ?? '[]');
    } catch { return []; }
  }

  agregarRegistro(rec: AttendanceRecord): void {
    const lista = this.getRegistros();
    lista.unshift({ ...rec, id: rec.id ?? 'rec-' + Date.now() });
    // Guardar máximo 500 registros en local
    if (lista.length > 500) lista.splice(500);
    localStorage.setItem(KEYS.REGISTROS, JSON.stringify(lista));

    /* ── MODO REAL (Firebase Firestore) ───────────────────────
    // import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
    // await addDoc(collection(db, 'registros'), {
    //   ...rec,
    //   timestamp: serverTimestamp()
    // });
    ────────────────────────────────────────────────────────── */
  }

  getRegistrosPorUsuario(userId: string): AttendanceRecord[] {
    return this.getRegistros().filter(r => r.userId === userId);
  }

  getRegistrosHoy(): AttendanceRecord[] {
    const hoy = new Date().toDateString();
    return this.getRegistros().filter(r => {
      return r.timestamp ? new Date(r.timestamp).toDateString() === hoy : false;
    });
  }

  yaRegistroEntradaHoy(userId: string): boolean {
    const hoy = new Date().toDateString();
    return this.getRegistros().some(r =>
      r.userId === userId &&
      r.eventType === 'entrada' &&
      r.timestamp !== undefined &&
      new Date(r.timestamp).toDateString() === hoy
    );
  }

  // ════════════════════════════════════════════════════════════
  // FOTO DE ROSTRO DEL USUARIO (Base64 en localStorage)
  // En producción usar Firebase Storage
  // ════════════════════════════════════════════════════════════

  guardarFotoRostro(uid: string, dataUrl: string): void {
    try {
      localStorage.setItem(KEYS.FOTO_PREFIX + uid, dataUrl);
    } catch {
      console.warn('[StorageService] No se pudo guardar la foto (cuota excedida)');
    }

    /* ── MODO REAL (Firebase Storage) ────────────────────────
    // import { ref, uploadString, getDownloadURL } from 'firebase/storage';
    // const storageRef = ref(storage, `rostros/${uid}.jpg`);
    // await uploadString(storageRef, dataUrl, 'data_url');
    // const url = await getDownloadURL(storageRef);
    // await updateDoc(doc(db, 'empleados', uid), { fotoRostroUrl: url });
    ────────────────────────────────────────────────────────── */
  }

  obtenerFotoRostro(uid: string): string | null {
    return localStorage.getItem(KEYS.FOTO_PREFIX + uid);

    /* ── MODO REAL ────────────────────────────────────────────
    // const snap = await getDoc(doc(db, 'empleados', uid));
    // return snap.data()?.fotoRostroUrl ?? null;
    ────────────────────────────────────────────────────────── */
  }

  tieneFotoRostro(uid: string): boolean {
    return !!this.obtenerFotoRostro(uid);
  }

  // ════════════════════════════════════════════════════════════
  // LIMPIEZA (para pruebas)
  // ════════════════════════════════════════════════════════════
  limpiarTodo(): void {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }
}
