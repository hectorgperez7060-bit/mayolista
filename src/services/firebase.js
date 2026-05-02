import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  doc, setDoc, getDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  query, where, onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA6pXIoB-xoJnvEzTJHbqTZ_1eWzBKpCRA",
  authDomain: "mayolista.firebaseapp.com",
  projectId: "mayolista",
  storageBucket: "mayolista.firebasestorage.app",
  messagingSenderId: "238284406595",
  appId: "1:238284406595:web:7a9d64da609afbb26279f6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export async function getDeviceId() {
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser.uid;
}

function generateCode(nombre = '') {
  const prefix = nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'MAYO';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
}

export async function createEmpresa(mayorista, products) {
  const deviceId = await getDeviceId();
  const codigo   = generateCode(mayorista.nombre);
  const ref      = doc(collection(db, 'empresas'));
  const logo     = localStorage.getItem('mayorista-logo') || '';

  await setDoc(ref, {
    nombre:       mayorista.nombre       || '',
    cuit:         mayorista.cuit         || '',
    telefono:     mayorista.telefono     || '',
    email:        mayorista.email        || '',
    direccion:    mayorista.direccion    || '',
    condicionIVA: mayorista.condicionIVA || '',
    logo,
    codigo,
    codigoActivo:  true,
    adminDeviceId: deviceId,
    createdAt:     serverTimestamp()
  });

  await Promise.all(products.map(p =>
    addDoc(collection(db, 'empresas', ref.id, 'productos'), p)
  ));

  await setDoc(doc(db, 'empresas', ref.id, 'vendedores', deviceId), {
    nombre:      'Admin',
    deviceId,
    bloqueado:   false,
    rol:         'admin',
    connectedAt: serverTimestamp(),
    lastSeen:    serverTimestamp()
  });

  return { empresaId: ref.id, codigo };
}

export async function joinEmpresa(codigo, nombreVendedor) {
  const deviceId = await getDeviceId();
  const q = query(
    collection(db, 'empresas'),
    where('codigo',       '==', codigo.toUpperCase()),
    where('codigoActivo', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Código inválido o desactivado');

  const empresaDoc = snap.docs[0];
  const empresaId  = empresaDoc.id;

  await setDoc(doc(db, 'empresas', empresaId, 'vendedores', deviceId), {
    nombre:      nombreVendedor,
    deviceId,
    bloqueado:   false,
    rol:         'vendor',
    connectedAt: serverTimestamp(),
    lastSeen:    serverTimestamp()
  }, { merge: true });

  return { empresaId, empresaData: empresaDoc.data() };
}

export async function getEmpresaData(empresaId) {
  const snap = await getDoc(doc(db, 'empresas', empresaId));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function getProductos(empresaId) {
  const snap = await getDocs(collection(db, 'empresas', empresaId, 'productos'));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function syncProductos(empresaId, products) {
  const existing = await getDocs(collection(db, 'empresas', empresaId, 'productos'));
  await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));
  await Promise.all(products.map(p =>
    addDoc(collection(db, 'empresas', empresaId, 'productos'), p)
  ));
}

export async function updateEmpresaData(empresaId, mayorista) {
  const logo = localStorage.getItem('mayorista-logo') || '';
  await updateDoc(doc(db, 'empresas', empresaId), {
    nombre:       mayorista.nombre       || '',
    cuit:         mayorista.cuit         || '',
    telefono:     mayorista.telefono     || '',
    email:        mayorista.email        || '',
    direccion:    mayorista.direccion    || '',
    condicionIVA: mayorista.condicionIVA || '',
    logo
  });
}

export async function renewCode(empresaId, nombreEmpresa) {
  const newCode = generateCode(nombreEmpresa);
  await updateDoc(doc(db, 'empresas', empresaId), { codigo: newCode });
  return newCode;
}

export async function saveOrderToFirebase(empresaId, vendedorId, vendedorNombre, order) {
  await addDoc(collection(db, 'empresas', empresaId, 'pedidos'), {
    vendedorId,
    vendedorNombre,
    client:        order.client,
    items:         order.items,
    total:         order.total,
    orderDiscount: order.orderDiscount || null,
    date:          serverTimestamp(),
    estado:        'pendiente'
  });
}

export async function setVendorBlocked(empresaId, vendedorId, bloqueado) {
  await updateDoc(doc(db, 'empresas', empresaId, 'vendedores', vendedorId), { bloqueado });
}

export async function markOrderSeen(empresaId, pedidoId) {
  await updateDoc(doc(db, 'empresas', empresaId, 'pedidos', pedidoId), { estado: 'visto' });
}

export async function updateLastSeen(empresaId, vendedorId) {
  try {
    await updateDoc(doc(db, 'empresas', empresaId, 'vendedores', vendedorId), {
      lastSeen: serverTimestamp()
    });
  } catch {}
}

export function listenVendedores(empresaId, cb) {
  return onSnapshot(collection(db, 'empresas', empresaId, 'vendedores'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function listenPedidos(empresaId, cb) {
  return onSnapshot(collection(db, 'empresas', empresaId, 'pedidos'), snap => {
    cb(
      snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date?.toMillis?.() || 0) - (a.date?.toMillis?.() || 0))
    );
  });
}

export function listenVendedorBlocked(empresaId, vendedorId, cb) {
  return onSnapshot(doc(db, 'empresas', empresaId, 'vendedores', vendedorId), snap => {
    if (!snap.exists()) return;
    cb(snap.data().bloqueado || false);
  });
}
