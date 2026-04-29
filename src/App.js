import { useState, useEffect, useRef, useMemo } from "react"
import { db } from "./firebase"
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore"

// ── CONSTANTES ───────────────────────────────────────────────
const EQUIPO = ["Antonio","Elisa","Irene","Laura","Gonzalo","Andrea","Esther","Victoria","Rocio"]
const ZONAS_LIMPIEZA = ["Mostrador","Almacén","Sala trasera","Baño","Zona fría","Escaparate","Suelo general"]
const ESTADOS_PEDIDO = ["Recibido","Gestionado","Metido"]
const colorEstado = { Recibido:"#f59e0b", Gestionado:"#3b82f6", Metido:"#10b981" }
const PIN_EQUIPO = "1234"
const PIN_ADMIN = "9999"

// ── PLANNING COMPLETO DESDE EXCEL ────────────────────────────
const PLANNING = {
  "2026-04-27":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-04-28":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-04-29":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-04-30":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-05-01":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"DSC",Esther:"M",Victoria:"VAC",Rocio:"T",festivo:"★ Día del Trabajo"},
  "2026-05-02":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"DSC",Laura:"T",Andrea:"DSC",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-05-04":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-05":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-06":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-07":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-08":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-09":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"DSC",Andrea:"DSC",Esther:"M",Victoria:"VAC",Rocio:"M"},
  "2026-05-11":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-12":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-13":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-14":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-15":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-16":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-18":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-05-19":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-05-20":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-05-21":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-05-22":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-05-23":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"DSC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-05-25":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-26":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-27":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-28":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-29":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-05-30":{Antonio:"DSC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-01":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-02":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-03":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-04":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-05":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-06":{Antonio:"DSC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-08":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-09":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-10":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-11":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-12":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-06-13":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"DSC",Rocio:"T"},
  "2026-06-15":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-16":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-17":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-18":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-19":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-20":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"DSC",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-06-22":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-06-23":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-06-24":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-06-25":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-06-26":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-06-27":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"DSC",Laura:"T",Andrea:"T",Esther:"DSC",Victoria:"M",Rocio:"T"},
  "2026-06-29":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-06-30":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-01":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-02":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-03":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-04":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"DSC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"DSC"},
  "2026-07-06":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-07-07":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-07-08":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-07-09":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-07-10":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-07-11":{Antonio:"DSC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"DSC",Rocio:"T"},
  "2026-07-13":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-07-14":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-07-15":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-07-16":{Antonio:"M",Elisa:"DSC",Gonzalo:"T",Irene:"DSC",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M",festivo:"★ Virgen del Carmen"},
  "2026-07-17":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-18":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"DSC",Laura:"M",Andrea:"T",Esther:"DSC",Victoria:"T",Rocio:"M"},
  "2026-07-20":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-07-21":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-07-22":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-07-23":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-07-24":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-07-25":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"T",Laura:"M",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"DSC"},
  "2026-07-27":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-28":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-29":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-30":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-07-31":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-01":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"DSC",Laura:"T",Andrea:"DSC",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-03":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-04":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-05":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-06":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-07":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-08":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"DSC",Andrea:"DSC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-10":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-11":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-12":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-13":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-14":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-15":{Antonio:"DSC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"DSC",festivo:"★ Asunción de la Virgen"},
  "2026-08-17":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-18":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-19":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-20":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-21":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-08-22":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"M",Laura:"T",Andrea:"M",Esther:"T",Victoria:"DSC",Rocio:"T"},
  "2026-08-24":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-25":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-26":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-27":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-28":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-08-29":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"T",Laura:"DSC",Andrea:"M",Esther:"DSC",Victoria:"T",Rocio:"M"},
  "2026-08-31":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-09-01":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-09-02":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-09-03":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-09-04":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-09-05":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"DSC",Laura:"T",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"DSC"},
  "2026-09-07":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-08":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-09":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-10":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-11":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-12":{Antonio:"DSC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"DSC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-14":{Antonio:"M",Elisa:"VAC",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-09-15":{Antonio:"M",Elisa:"VAC",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-09-16":{Antonio:"M",Elisa:"VAC",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-09-17":{Antonio:"M",Elisa:"VAC",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-09-18":{Antonio:"M",Elisa:"VAC",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-09-19":{Antonio:"M",Elisa:"VAC",Gonzalo:"DSC",Irene:"T",Laura:"M",Andrea:"M",Esther:"T",Victoria:"DSC",Rocio:"T"},
  "2026-09-21":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-22":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-23":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-24":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-25":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-09-26":{Antonio:"M",Elisa:"VAC",Gonzalo:"T",Irene:"DSC",Laura:"M",Andrea:"M",Esther:"DSC",Victoria:"T",Rocio:"T"},
  "2026-09-28":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-09-29":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-09-30":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-10-01":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-10-02":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-10-03":{Antonio:"DSC",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-10-05":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-06":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-07":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"DSC",Rocio:"T",festivo:"★ Virgen del Rosario"},
  "2026-10-08":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-09":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-10":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"VAC",Andrea:"DSC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-12":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M",festivo:"★ Fiesta Nacional"},
  "2026-10-13":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-10-14":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-10-15":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-10-16":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-10-17":{Antonio:"T",Elisa:"M",Gonzalo:"VAC",Irene:"M",Laura:"VAC",Andrea:"T",Esther:"T",Victoria:"M",Rocio:"M"},
  "2026-10-19":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-20":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-21":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-22":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-23":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-24":{Antonio:"M",Elisa:"M",Gonzalo:"VAC",Irene:"T",Laura:"VAC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-10-26":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-10-27":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-10-28":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"M",Rocio:"T"},
  "2026-10-29":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-10-30":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"M"},
  "2026-10-31":{Antonio:"VAC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"DSC"},
  "2026-11-02":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"DSC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T",festivo:"★ Todos los Santos"},
  "2026-11-03":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-11-04":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-11-05":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-11-06":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-11-07":{Antonio:"VAC",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"DSC",Andrea:"M",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-11-09":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"VAC"},
  "2026-11-10":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"VAC"},
  "2026-11-11":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"VAC"},
  "2026-11-12":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"VAC"},
  "2026-11-13":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"M",Rocio:"VAC"},
  "2026-11-14":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"DSC",Rocio:"VAC"},
  "2026-11-16":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"VAC"},
  "2026-11-17":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"VAC"},
  "2026-11-18":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"VAC"},
  "2026-11-19":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"VAC"},
  "2026-11-20":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"M",Victoria:"T",Rocio:"VAC"},
  "2026-11-21":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"T",Esther:"DSC",Victoria:"T",Rocio:"VAC"},
  "2026-11-23":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-24":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-25":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-26":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-27":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-28":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"T",Laura:"T",Andrea:"M",Esther:"T",Victoria:"VAC",Rocio:"M"},
  "2026-11-30":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-01":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-02":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-03":{Antonio:"T",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-04":{Antonio:"T",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"M",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-05":{Antonio:"T",Elisa:"M",Gonzalo:"T",Irene:"DSC",Laura:"M",Andrea:"M",Esther:"M",Victoria:"VAC",Rocio:"T"},
  "2026-12-07":{Antonio:"M",Elisa:"M",Gonzalo:"DSC",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"M",festivo:"★ Día Constitución"},
  "2026-12-08":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"DSC",festivo:"★ Inmaculada"},
  "2026-12-09":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-12-10":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-12-11":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"M"},
  "2026-12-12":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"VAC",Laura:"T",Andrea:"VAC",Esther:"T",Victoria:"T",Rocio:"DSC"},
  "2026-12-14":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"M",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-12-15":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"M",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-12-16":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"M",Andrea:"VAC",Esther:"M",Victoria:"T",Rocio:"T"},
  "2026-12-17":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-12-18":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"M",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-12-19":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"VAC",Laura:"DSC",Andrea:"VAC",Esther:"T",Victoria:"M",Rocio:"T"},
  "2026-12-21":{Antonio:"T",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"M",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M"},
  "2026-12-22":{Antonio:"T",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"M",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M"},
  "2026-12-23":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M"},
  "2026-12-24":{Antonio:"M",Elisa:"M",Gonzalo:"M",Irene:"T",Laura:"M",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M"},
  "2026-12-25":{Antonio:"DSC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"M",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M",festivo:"★ Navidad"},
  "2026-12-26":{Antonio:"DSC",Elisa:"M",Gonzalo:"M",Irene:"M",Laura:"T",Andrea:"T",Esther:"VAC",Victoria:"T",Rocio:"M"},
  "2026-12-28":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"VAC",Victoria:"M",Rocio:"T"},
  "2026-12-29":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"VAC",Victoria:"M",Rocio:"T"},
  "2026-12-30":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"VAC",Victoria:"M",Rocio:"T"},
  "2026-12-31":{Antonio:"M",Elisa:"M",Gonzalo:"T",Irene:"M",Laura:"T",Andrea:"M",Esther:"VAC",Victoria:"M",Rocio:"T"},
}

const todayKey = () => new Date().toISOString().slice(0,10)
const todayLabel = () => new Date().toLocaleDateString("es-ES",{weekday:"long",year:"numeric",month:"long",day:"numeric"})

const emptyTurno = () => ({
  pedidos:[],incidencias:[],encargos:[],vacunas:[],formulasMagistrales:[],
  limpieza:{zonas:[],hecho:false,notas:""},
  stocks:false,caducidades:false,almacenArreglado:false,
  repuestoFuera:false,repuestoDentro:false,ordenadoAlmacen:false,bajadoCajas:false,
  responsable:"",equipoPresente:[],notaTraspaso:"",
  temperatura:null,
})

const emptyDay = () => ({
  fecha:todayLabel(),fechaKey:todayKey(),
  turnos:{manana:emptyTurno(),tarde:emptyTurno()},
})

// ── ESTILOS ──────────────────────────────────────────────────
const inputStyle = {padding:"10px 12px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1e293b",background:"#f8fafc",outline:"none"}
const addBtnStyle = {padding:"8px 16px",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}
const deleteBtnStyle = {width:28,height:28,borderRadius:8,border:"none",background:"#fee2e2",color:"#ef4444",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}
const editBtnStyle = {width:28,height:28,borderRadius:8,border:"none",background:"#eff6ff",color:"#3b82f6",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}

// ── COMPONENTES BASE ─────────────────────────────────────────
const Badge = ({text,color}) => (<span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,background:color+"22",color,border:`1px solid ${color}44`}}>{text}</span>)
const Card = ({children,style={}}) => (<div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 2px 12px #0001",border:"1px solid #f1f5f9",...style}}>{children}</div>)
const SectionTitle = ({children,icon}) => (<h3 style={{fontSize:16,fontWeight:700,color:"#1e293b",marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span>{icon}</span>{children}</h3>)
const EmptyState = ({text}) => (<div style={{textAlign:"center",padding:"32px 20px",color:"#94a3b8",fontSize:14}}><div style={{fontSize:36,marginBottom:8}}>📭</div>{text}</div>)
const CheckBox = ({label,checked,onChange}) => (
  <button onClick={()=>onChange(!checked)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:checked?"#d1fae5":"#fff",border:`2px solid ${checked?"#10b981":"#e2e8f0"}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:14,color:checked?"#065f46":"#475569",fontWeight:checked?600:400,width:"100%",textAlign:"left"}}>
    <span style={{fontSize:18}}>{checked?"✅":"⬜"}</span>{label}
  </button>
)
const Pill = ({label,onClick,active}) => (<button onClick={onClick} style={{padding:"5px 13px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",background:active?"#6366f1":"#f1f5f9",color:active?"#fff":"#64748b",border:"none",fontFamily:"inherit"}}>{label}</button>)
const TurnoSelector = ({turno,onChange}) => (
  <div style={{display:"flex",borderRadius:12,overflow:"hidden",border:"2px solid #e0e7ff",background:"#eef2ff"}}>
    <button onClick={()=>onChange("manana")} style={{flex:1,padding:"12px 16px",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",background:turno==="manana"?"#fbbf24":"transparent",color:turno==="manana"?"#92400e":"#6366f1"}}>☀️ Mañana</button>
    <button onClick={()=>onChange("tarde")} style={{flex:1,padding:"12px 16px",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",background:turno==="tarde"?"#6366f1":"transparent",color:turno==="tarde"?"#fff":"#6366f1"}}>🌙 Tarde</button>
  </div>
)

// ── FOTO UPLOADER ────────────────────────────────────────────
function FotoUploader({fotos=[],onChange}){
  const [loading,setLoading] = useState(false)
  const fileRef = useRef()
  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if(!file) return
    if(file.size>2*1024*1024){alert("Máximo 2MB");return}
    setLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {onChange([...fotos,ev.target.result]);setLoading(false)}
    reader.readAsDataURL(file)
    e.target.value = ""
  }
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:fotos.length>0?10:0}}>
        {fotos.map((url,i) => (
          <div key={i} style={{position:"relative"}}>
            <img src={url} alt="foto" style={{width:80,height:80,objectFit:"cover",borderRadius:10,border:"2px solid #e2e8f0",cursor:"pointer"}} onClick={()=>window.open(url)} />
            <button onClick={()=>onChange(fotos.filter((_,j)=>j!==i))} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:"#ef4444",color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:"none"}} />
      <button onClick={()=>fileRef.current?.click()} disabled={loading} style={{padding:"8px 14px",background:loading?"#e2e8f0":"#f0fdf4",border:"2px solid #bbf7d0",borderRadius:10,fontSize:13,fontWeight:600,cursor:loading?"not-allowed":"pointer",color:"#16a34a",fontFamily:"inherit"}}>
        {loading?"⏳ Procesando...":"📸 Añadir foto"}
      </button>
    </div>
  )
}

// ── PIN SCREEN ───────────────────────────────────────────────
function PinScreen({onUnlock}){
  const [pin,setPin] = useState("")
  const [error,setError] = useState("")
  const handleKey = (k) => {
    if(k==="del"){setPin(p=>p.slice(0,-1));setError("");return}
    const next = pin+k
    setPin(next)
    if(next.length===4){
      if(next===PIN_EQUIPO){onUnlock("equipo")}
      else if(next===PIN_ADMIN){onUnlock("admin")}
      else{setError("PIN incorrecto");setTimeout(()=>{setPin("");setError("")},800)}
    }
  }
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:40,width:"100%",maxWidth:300,textAlign:"center",boxShadow:"0 20px 60px #0003"}}>
        <div style={{fontSize:40,marginBottom:8}}>💊</div>
        <div style={{fontSize:22,fontWeight:900,color:"#1e293b",marginBottom:4}}>FarmaciaFlow</div>
        <div style={{fontSize:14,color:"#94a3b8",marginBottom:28}}>Introduce el PIN de acceso</div>
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:24}}>
          {[0,1,2,3].map(i=>(<div key={i} style={{width:16,height:16,borderRadius:"50%",background:pin.length>i?"#6366f1":"#e2e8f0",transition:"background 0.2s"}} />))}
        </div>
        {error&&<div style={{color:"#ef4444",fontSize:13,fontWeight:600,marginBottom:12}}>{error}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=>(
            k===""?<div key={i} />:
            <button key={i} onClick={()=>handleKey(k)} style={{padding:"16px 0",borderRadius:12,border:"none",background:k==="del"?"#fee2e2":"#f8fafc",color:k==="del"?"#ef4444":"#1e293b",fontSize:k==="del"?18:20,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {k==="del"?"⌫":k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── APP PRINCIPAL ────────────────────────────────────────────
export default function App(){
  const [role,setRole] = useState(()=>sessionStorage.getItem("ff_role")||null)
  const [activeTab,setActiveTab] = useState("resumen")
  const [dayData,setDayData] = useState(emptyDay())
  const [activeTurno,setActiveTurno] = useState("manana")
  const [showModal,setShowModal] = useState(null)
  const [formData,setFormData] = useState({})
  const [editingItem,setEditingItem] = useState(null)
  const [historial,setHistorial] = useState([])
  const [savedMsg,setSavedMsg] = useState("")
  const [saving,setSaving] = useState(false)
  const [selectedDay,setSelectedDay] = useState(null)
  const [selectedDayTurno,setSelectedDayTurno] = useState("manana")
  const [editingHistorialDay,setEditingHistorialDay] = useState(null)
  const [searchQuery,setSearchQuery] = useState("")
  const [chatMessages,setChatMessages] = useState([])
  const [chatInput,setChatInput] = useState("")
  const [chatUser,setChatUser] = useState("")
  const [anuncios,setAnuncios] = useState([])
  const [showAnuncioForm,setShowAnuncioForm] = useState(false)
  const [newAnuncio,setNewAnuncio] = useState({titulo:"",texto:"",tipo:"info"})
  const [calViewDate,setCalViewDate] = useState(new Date())
  const [calPerson,setCalPerson] = useState("Antonio")
  const [marcaPersona,setMarcaPersona] = useState("Antonio")
  const [marcaData,setMarcaData] = useState({})
  const chatEndRef = useRef(null)

  const handleUnlock = (r) => {sessionStorage.setItem("ff_role",r);setRole(r)}

  useEffect(()=>{
    if(!role) return
    const unsub = onSnapshot(doc(db,"jornadas",todayKey()),(snap)=>{
      if(snap.exists()) setDayData({...emptyDay(),...snap.data()})
    })
    return ()=>unsub()
  },[role])

  useEffect(()=>{
    if(!role) return
    const q = query(collection(db,"jornadas"),orderBy("fechaKey","desc"))
    const unsub = onSnapshot(q,(snap)=>{setHistorial(snap.docs.map(d=>({id:d.id,...d.data()})))})
    return ()=>unsub()
  },[role])

  useEffect(()=>{
    if(!role) return
    const q = query(collection(db,"chat"),orderBy("timestamp","asc"))
    const unsub = onSnapshot(q,(snap)=>{
      setChatMessages(snap.docs.map(d=>({id:d.id,...d.data()})))
      setTimeout(()=>chatEndRef.current?.scrollIntoView({behavior:"smooth"}),100)
    })
    return ()=>unsub()
  },[role])

  useEffect(()=>{
    if(!role) return
    const q = query(collection(db,"anuncios"),orderBy("timestamp","desc"))
    const unsub = onSnapshot(q,(snap)=>{setAnuncios(snap.docs.map(d=>({id:d.id,...d.data()})))})
    return ()=>unsub()
  },[role])

  if(!role) return <PinScreen onUnlock={handleUnlock} />

  const isAdmin = role==="admin"
  const turnoData = dayData.turnos?.[activeTurno]||emptyTurno()

  const saveDay = async(silent=false) => {
    if(!silent) setSaving(true)
    try{
      await setDoc(doc(db,"jornadas",todayKey()),{...dayData,fechaKey:todayKey(),fecha:todayLabel()})
      if(!silent) setSavedMsg("✓ Guardado correctamente")
    }catch{if(!silent) setSavedMsg("❌ Error al guardar.")}
    if(!silent) setSaving(false)
    if(!silent) setTimeout(()=>setSavedMsg(""),3000)
  }

  const autoSave = async(updatedData) => {
    try{
      await setDoc(doc(db,"jornadas",todayKey()),{...updatedData,fechaKey:todayKey(),fecha:todayLabel()})
      setSavedMsg("✓ Guardado")
      setTimeout(()=>setSavedMsg(""),2000)
    }catch{}
  }

  const saveHistorialDay = async(updatedData) => {
    try{
      await setDoc(doc(db,"jornadas",updatedData.fechaKey),updatedData)
      setEditingHistorialDay(null)
      setSelectedDay(updatedData)
      setSavedMsg("✓ Jornada actualizada")
      setTimeout(()=>setSavedMsg(""),3000)
    }catch{alert("Error al guardar.")}
  }

  const deleteDay = async(fechaKey) => {
    if(!window.confirm("¿Seguro que quieres borrar esta jornada?")) return
    try{await deleteDoc(doc(db,"jornadas",fechaKey));setSelectedDay(null)}catch{alert("Error al borrar.")}
  }

  const sendMessage = async() => {
    if(!chatInput.trim()||!chatUser) return
    await addDoc(collection(db,"chat"),{texto:chatInput.trim(),autor:chatUser,timestamp:serverTimestamp(),fecha:new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}),dia:todayKey()})
    setChatInput("")
  }

  const addAnuncio = async() => {
    if(!newAnuncio.titulo.trim()) return
    await addDoc(collection(db,"anuncios"),{...newAnuncio,autor:"Antonio",timestamp:serverTimestamp(),fecha:new Date().toLocaleDateString("es-ES")})
    setNewAnuncio({titulo:"",texto:"",tipo:"info"})
    setShowAnuncioForm(false)
  }

  const deleteAnuncio = async(id) => {
    await deleteDoc(doc(db,"anuncios",id))
  }

  const updateTurno = (key,value) => {
    setDayData(prev=>({...prev,turnos:{...prev.turnos,[activeTurno]:{...(prev.turnos?.[activeTurno]||emptyTurno()),[key]:value}}}))
  }

  const openModal = (type,item=null) => {setShowModal(type);setFormData(item?{...item}:{});setEditingItem(item?{key:type,id:item.id}:null)}
  const closeModal = () => {setShowModal(null);setFormData({});setEditingItem(null)}
  const addItem = (key) => {
    const current = turnoData[key]||[]
    let updatedTurnos
    if(editingItem){
      const updated = current.map(i=>i.id===editingItem.id?{...formData,id:editingItem.id}:i)
      updatedTurnos = {...dayData,turnos:{...dayData.turnos,[activeTurno]:{...turnoData,[key]:updated}}}
    } else {
      const updated = [...current,{...formData,id:Date.now()}]
      updatedTurnos = {...dayData,turnos:{...dayData.turnos,[activeTurno]:{...turnoData,[key]:updated}}}
    }
    setDayData(updatedTurnos)
    autoSave(updatedTurnos)
    closeModal()
  }
  const removeItem = (key,id) => {
    const updated = (turnoData[key]||[]).filter(i=>i.id!==id)
    const updatedData = {...dayData,turnos:{...dayData.turnos,[activeTurno]:{...turnoData,[key]:updated}}}
    setDayData(updatedData)
    autoSave(updatedData)
  }
  const toggleLimpiezaZona = (zona) => {
    const zonas = turnoData.limpieza.zonas.includes(zona)?turnoData.limpieza.zonas.filter(z=>z!==zona):[...turnoData.limpieza.zonas,zona]
    updateTurno("limpieza",{...turnoData.limpieza,zonas})
  }

  const pendientes = historial.filter(d=>d.fechaKey!==todayKey()).flatMap(d=>{
    const items=[]
    ;["manana","tarde"].forEach(t=>{
      const td=d.turnos?.[t]||emptyTurno()
      items.push(
        ...(td.encargos||[]).filter(e=>e.estado!=="Entregado").map(e=>({...e,tipo:"encargo",fecha:d.fecha,fechaKey:d.fechaKey})),
        ...(td.vacunas||[]).filter(v=>v.estado!=="Dispensada").map(v=>({...v,tipo:"vacuna",fecha:d.fecha,fechaKey:d.fechaKey})),
        ...(td.formulasMagistrales||[]).filter(f=>f.estado!=="Recogida").map(f=>({...f,tipo:"formula",fecha:d.fecha,fechaKey:d.fechaKey})),
      )
    })
    return items
  })

  const filteredHistorial = useMemo(()=>historial.filter(d=>{
    if(!searchQuery) return true
    const q=searchQuery.toLowerCase()
    return d.fecha?.toLowerCase().includes(q)||
      d.turnos?.manana?.responsable?.toLowerCase().includes(q)||
      d.turnos?.tarde?.responsable?.toLowerCase().includes(q)||
      (d.turnos?.manana?.pedidos||[]).some(p=>p.proveedor?.toLowerCase().includes(q))||
      (d.turnos?.tarde?.pedidos||[]).some(p=>p.proveedor?.toLowerCase().includes(q))
  }),[historial,searchQuery])

  const colorAnuncio = {info:"#3b82f6",urgente:"#ef4444",recordatorio:"#f59e0b"}
  const iconAnuncio = {info:"📢",urgente:"🚨",recordatorio:"📌"}

  const tabs = [
    {id:"resumen",label:"🏠 Inicio"},
    ...(isAdmin?[{id:"calendario",label:"📅 Turnos"}]:[]),
    {id:"pedidos",label:"📦 Pedidos"},
    {id:"incidencias",label:"⚠️ Incid."},
    {id:"encargos",label:"💊 Encargos"},
    {id:"tareas",label:"✅ Tareas"},
    {id:"marca",label:"🏷️ Marca"},
    {id:"chat",label:"💬 Chat"},
    {id:"historial",label:"📋 Historial"},
    ...(isAdmin?[{id:"admin",label:"👑 Admin"}]:[]),
  ]

  // ── RENDER RESUMEN ──────────────────────────────────────────
  const renderResumen = () => {
    const notaAnterior = activeTurno==="tarde"&&dayData.turnos?.manana?.notaTraspaso
      ?dayData.turnos.manana.notaTraspaso
      :historial.find(d=>d.fechaKey!==todayKey())?.turnos?.tarde?.notaTraspaso
    const todayPlanning = PLANNING[todayKey()]
    const mananaHoy = todayPlanning?EQUIPO.filter(p=>todayPlanning[p]==="M"):[]
    const tardeHoy = todayPlanning?EQUIPO.filter(p=>todayPlanning[p]==="T"):[]
    const descansosHoy = todayPlanning?EQUIPO.filter(p=>todayPlanning[p]==="DSC"||todayPlanning[p]==="DSC*"):[]
    const vacasHoy = todayPlanning?EQUIPO.filter(p=>todayPlanning[p]==="VAC"):[]
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card>
          <div style={{fontSize:13,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Hoy</div>
          <div style={{fontSize:15,color:"#334155",fontWeight:700,marginBottom:14}}>{todayLabel()}</div>
          {todayPlanning?.festivo&&<div style={{padding:"6px 12px",background:"#fef3c7",borderRadius:8,fontSize:13,color:"#92400e",fontWeight:600,marginBottom:12}}>{todayPlanning.festivo}</div>}
          <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
        </Card>

        {/* Quién trabaja hoy */}
        {todayPlanning&&(
          <Card>
            <SectionTitle icon="👥">Equipo de hoy</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#fffbeb",borderRadius:10,padding:"10px 12px",border:"1px solid #fde68a"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:6}}>☀️ Mañana</div>
                {mananaHoy.map(p=><div key={p} style={{fontSize:13,color:"#78350f",fontWeight:500}}>{p}</div>)}
              </div>
              <div style={{background:"#eef2ff",borderRadius:10,padding:"10px 12px",border:"1px solid #c7d2fe"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#4338ca",marginBottom:6}}>🌙 Tarde</div>
                {tardeHoy.map(p=><div key={p} style={{fontSize:13,color:"#3730a3",fontWeight:500}}>{p}</div>)}
              </div>
            </div>
            {(descansosHoy.length>0||vacasHoy.length>0)&&(
              <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                {descansosHoy.map(p=><Badge key={p} text={`😴 ${p}`} color="#94a3b8" />)}
                {vacasHoy.map(p=><Badge key={p} text={`🏖️ ${p}`} color="#10b981" />)}
              </div>
            )}
          </Card>
        )}

        {/* Anuncios */}
        {anuncios.length>0&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {anuncios.map(a=>(
              <Card key={a.id} style={{borderLeft:`4px solid ${colorAnuncio[a.tipo]||"#6366f1"}`,background:colorAnuncio[a.tipo]+"11"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{iconAnuncio[a.tipo]} {a.titulo}</div>
                    {a.texto&&<div style={{fontSize:13,color:"#64748b",marginTop:4}}>{a.texto}</div>}
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{a.fecha} · {a.autor}</div>
                  </div>
                  {isAdmin&&<button onClick={()=>deleteAnuncio(a.id)} style={{...deleteBtnStyle,flexShrink:0}}>✕</button>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {notaAnterior&&(<Card style={{borderLeft:"4px solid #f59e0b",background:"#fffbeb"}}><SectionTitle icon="📝">Nota del turno anterior</SectionTitle><div style={{fontSize:14,color:"#92400e"}}>{notaAnterior}</div></Card>)}

        {pendientes.length>0&&(
          <Card style={{borderLeft:"4px solid #ef4444",background:"#fef2f2"}}>
            <SectionTitle icon="🔔">Pendientes ({pendientes.length})</SectionTitle>
            {pendientes.slice(0,4).map((p,i)=>(<div key={i} style={{padding:"8px 12px",background:"#fff",borderRadius:10,marginBottom:8,fontSize:13}}><div style={{fontWeight:700,color:"#1e293b"}}>{p.tipo==="encargo"?"🧪 ":p.tipo==="vacuna"?"💉 ":"⚗️ "}{p.descripcion||p.vacuna||p.formula}</div><div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>{p.cliente&&<Badge text={p.cliente} color="#6366f1" />}{p.estado&&<Badge text={p.estado} color="#f59e0b" />}</div></div>))}
            {pendientes.length>4&&<div style={{fontSize:12,color:"#ef4444",fontWeight:600}}>+{pendientes.length-4} más...</div>}
          </Card>
        )}

        <Card>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:6,display:"block"}}>Responsable del turno</label>
              <select value={turnoData.responsable} onChange={e=>updateTurno("responsable",e.target.value)} style={{...inputStyle,width:"100%",boxSizing:"border-box"}}>
                <option value="">Seleccionar...</option>
                {EQUIPO.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle icon="📝">Nota de traspaso</SectionTitle>
          <textarea value={turnoData.notaTraspaso||""} onChange={e=>updateTurno("notaTraspaso",e.target.value)} placeholder="Escribe aquí lo que debe saber el siguiente turno..." rows={3} style={{...inputStyle,width:"100%",boxSizing:"border-box",resize:"vertical"}} />
        </Card>

        {/* Temperatura */}
        <Card>
          <SectionTitle icon="🌡️">Temperatura frigorífico</SectionTitle>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <input
              type="number" step="0.1"
              value={turnoData.temperatura||""}
              onChange={e=>updateTurno("temperatura",e.target.value)}
              placeholder="Ej: 4.5"
              style={{...inputStyle,flex:1,boxSizing:"border-box"}}
            />
            <span style={{fontSize:14,color:"#64748b",fontWeight:600}}>°C</span>
            {turnoData.temperatura&&(
              <Badge
                text={parseFloat(turnoData.temperatura)>=2&&parseFloat(turnoData.temperatura)<=8?"✓ OK":"⚠️ Fuera de rango"}
                color={parseFloat(turnoData.temperatura)>=2&&parseFloat(turnoData.temperatura)<=8?"#10b981":"#ef4444"}
              />
            )}
          </div>
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>Rango correcto: 2°C – 8°C</div>
        </Card>

        <button onClick={saveDay} disabled={saving} style={{background:saving?"#a5b4fc":"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6366f144"}}>{saving?"⏳ Guardando...":"💾 Guardar jornada"}</button>
        {savedMsg&&<div style={{textAlign:"center",color:savedMsg.startsWith("✓")?"#10b981":"#ef4444",fontWeight:700,fontSize:15}}>{savedMsg}</div>}
        <button onClick={()=>{sessionStorage.removeItem("ff_role");setRole(null)}} style={{background:"none",border:"none",color:"#cbd5e1",fontSize:12,cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>🔒 Bloquear app</button>
      </div>
    )
  }

  // ── RENDER CALENDARIO ───────────────────────────────────────
  const renderCalendario = () => {
    const year = calViewDate.getFullYear()
    const month = calViewDate.getMonth()
    const firstDay = new Date(year,month,1).getDay()
    const daysInMonth = new Date(year,month+1,0).getDate()
    const monthName = calViewDate.toLocaleDateString("es-ES",{month:"long",year:"numeric"})
    const prevMonth = () => setCalViewDate(new Date(year,month-1,1))
    const nextMonth = () => setCalViewDate(new Date(year,month+1,1))
    const colorTurno = {M:"#6366f1",T:"#f59e0b",VAC:"#10b981",DSC:"#94a3b8","DSC*":"#64748b"}
    const bgTurno = {M:"#eef2ff",T:"#fffbeb",VAC:"#f0fdf4",DSC:"#f8fafc","DSC*":"#f1f5f9"}
    const days = []
    for(let i=0;i<(firstDay===0?6:firstDay-1);i++) days.push(null)
    for(let d=1;d<=daysInMonth;d++) days.push(d)
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>📅 Turnos del equipo</h2>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {EQUIPO.map(p=>(
            <button key={p} onClick={()=>setCalPerson(p)} style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:600,cursor:"pointer",background:calPerson===p?"#6366f1":"#f8fafc",color:calPerson===p?"#fff":"#64748b",border:`2px solid ${calPerson===p?"#6366f1":"#e2e8f0"}`,fontFamily:"inherit"}}>
              {p}
            </button>
          ))}
        </div>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button onClick={prevMonth} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>←</button>
            <div style={{fontWeight:800,color:"#1e293b",fontSize:15,textTransform:"capitalize"}}>{monthName}</div>
            <button onClick={nextMonth} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>→</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
            {["L","M","X","J","V","S","D"].map(d=>(<div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#94a3b8",padding:"4px 0"}}>{d}</div>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {days.map((d,i)=>{
              if(!d) return <div key={i} />
              const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
              const planning = PLANNING[dateStr]
              const turno = planning?.[calPerson]||null
              const isToday = dateStr===todayKey()
              const festivo = planning?.festivo
              return (
                <div key={i} style={{borderRadius:8,padding:"6px 4px",textAlign:"center",background:turno?bgTurno[turno]:"#f8fafc",border:`1px solid ${isToday?"#6366f1":"transparent"}`,boxShadow:isToday?"0 0 0 2px #6366f144":"none"}}>
                  <div style={{fontSize:11,fontWeight:isToday?800:500,color:isToday?"#6366f1":"#64748b"}}>{d}</div>
                  {turno&&<div style={{fontSize:10,fontWeight:700,color:colorTurno[turno]||"#64748b",marginTop:1}}>{turno==="VAC"?"VAC":turno==="DSC"||turno==="DSC*"?"DSC":turno}</div>}
                  {festivo&&<div style={{fontSize:8,color:"#f59e0b"}}>★</div>}
                </div>
              )
            })}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
            {[["M","Mañana","#6366f1"],["T","Tarde","#f59e0b"],["VAC","Vacaciones","#10b981"],["DSC","Descanso","#94a3b8"]].map(([k,l,c])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b"}}>
                <div style={{width:10,height:10,borderRadius:3,background:bgTurno[k],border:`1px solid ${c}`}} />
                <span style={{color:c,fontWeight:700}}>{k}</span> {l}
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  // ── RENDER PEDIDOS ───────────────────────────────────────────
  const renderPedidos = () => (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>📦 Pedidos</h2><button onClick={()=>openModal("pedido")} style={addBtnStyle}>+ Añadir</button></div>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      {(turnoData.pedidos||[]).length===0&&<EmptyState text="No hay pedidos en este turno" />}
      {(turnoData.pedidos||[]).map(p=>(
        <Card key={p.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#1e293b",fontSize:15}}>{p.proveedor}</div>
              {p.descripcion&&<div style={{color:"#64748b",fontSize:13,marginTop:4}}>{p.descripcion}</div>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}><Badge text={p.estado} color={colorEstado[p.estado]||"#6366f1"} />{p.responsable&&<Badge text={p.responsable} color="#8b5cf6" />}{p.incidencia&&<Badge text="⚠️ Incidencia" color="#ef4444" />}</div>
              {p.incidencia&&p.notaIncidencia&&<div style={{marginTop:8,padding:"8px 12px",background:"#fef2f2",borderRadius:8,color:"#dc2626",fontSize:13}}>🔴 {p.notaIncidencia}</div>}
              {(p.fotos||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>{p.fotos.map((url,i)=><img key={i} src={url} alt="foto" onClick={()=>window.open(url)} style={{width:60,height:60,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"2px solid #e2e8f0"}} />)}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>openModal("pedido",p)} style={editBtnStyle}>✏️</button>
              <button onClick={()=>removeItem("pedidos",p.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
      {savedMsg&&<div style={{textAlign:"center",color:savedMsg.startsWith("✓")?"#10b981":"#ef4444",fontWeight:700,fontSize:13,padding:"6px 0"}}>{savedMsg}</div>}
    </div>
  )

  // ── RENDER INCIDENCIAS ───────────────────────────────────────
  const renderIncidencias = () => (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>⚠️ Incidencias</h2><button onClick={()=>openModal("incidencia")} style={addBtnStyle}>+ Añadir</button></div>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      {(turnoData.incidencias||[]).length===0&&<EmptyState text="Sin incidencias en este turno 🎉" />}
      {(turnoData.incidencias||[]).map(inc=>(
        <Card key={inc.id} style={{borderLeft:"4px solid #f59e0b"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:"#92400e",fontSize:15}}>{inc.tipo}</div>
              <div style={{color:"#64748b",fontSize:13,marginTop:4}}>{inc.descripcion}</div>
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>{inc.responsable&&<Badge text={inc.responsable} color="#8b5cf6" />}{inc.resuelta&&<Badge text="✓ Resuelta" color="#10b981" />}</div>
              {(inc.fotos||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>{inc.fotos.map((url,i)=><img key={i} src={url} alt="foto" onClick={()=>window.open(url)} style={{width:60,height:60,objectFit:"cover",borderRadius:8,cursor:"pointer",border:"2px solid #e2e8f0"}} />)}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button onClick={()=>openModal("incidencia",inc)} style={editBtnStyle}>✏️</button>
              <button onClick={()=>removeItem("incidencias",inc.id)} style={deleteBtnStyle}>✕</button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  // ── RENDER ENCARGOS ──────────────────────────────────────────
  const renderEncargos = () => (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>💊 Encargos</h2>
      <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
      <Card><SectionTitle icon="🧪">Encargos especiales</SectionTitle><button onClick={()=>openModal("encargo")} style={{...addBtnStyle,marginBottom:12}}>+ Añadir</button>{(turnoData.encargos||[]).length===0&&<EmptyState text="Sin encargos" />}{(turnoData.encargos||[]).map(e=>(<div key={e.id} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:14}}>{e.descripcion}</div><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{e.cliente&&<Badge text={e.cliente} color="#6366f1" />}{e.responsable&&<Badge text={e.responsable} color="#8b5cf6" />}{e.estado&&<Badge text={e.estado} color={e.estado==="Entregado"?"#10b981":"#f59e0b"} />}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>openModal("encargo",e)} style={editBtnStyle}>✏️</button><button onClick={()=>removeItem("encargos",e.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="💉">Vacunas</SectionTitle><button onClick={()=>openModal("vacuna")} style={{...addBtnStyle,marginBottom:12}}>+ Añadir</button>{(turnoData.vacunas||[]).length===0&&<EmptyState text="Sin vacunas" />}{(turnoData.vacunas||[]).map(v=>(<div key={v.id} style={{padding:"10px 14px",background:"#eff6ff",borderRadius:10,marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:14}}>{v.vacuna}</div><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{v.cliente&&<Badge text={v.cliente} color="#3b82f6" />}{v.dosis&&<Badge text={`Dosis: ${v.dosis}`} color="#6366f1" />}{v.estado&&<Badge text={v.estado} color={v.estado==="Dispensada"?"#10b981":"#f59e0b"} />}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>openModal("vacuna",v)} style={editBtnStyle}>✏️</button><button onClick={()=>removeItem("vacunas",v.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
      <Card><SectionTitle icon="⚗️">Fórmulas magistrales</SectionTitle><button onClick={()=>openModal("formula")} style={{...addBtnStyle,marginBottom:12}}>+ Añadir</button>{(turnoData.formulasMagistrales||[]).length===0&&<EmptyState text="Sin fórmulas" />}{(turnoData.formulasMagistrales||[]).map(f=>(<div key={f.id} style={{padding:"10px 14px",background:"#f0fdf4",borderRadius:10,marginBottom:8,display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:700,fontSize:14}}>{f.formula}</div><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{f.cliente&&<Badge text={f.cliente} color="#10b981" />}{f.laboratorio&&<Badge text={f.laboratorio} color="#6366f1" />}{f.estado&&<Badge text={f.estado} color={f.estado==="Recogida"?"#10b981":"#f59e0b"} />}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>openModal("formula",f)} style={editBtnStyle}>✏️</button><button onClick={()=>removeItem("formulasMagistrales",f.id)} style={deleteBtnStyle}>✕</button></div></div>))}</Card>
    </div>
  )

  // ── RENDER TAREAS ────────────────────────────────────────────
  const renderTareas = () => {
    const tareasDone = [turnoData.stocks,turnoData.caducidades,turnoData.almacenArreglado,turnoData.repuestoFuera,turnoData.repuestoDentro,turnoData.ordenadoAlmacen,turnoData.bajadoCajas,turnoData.limpieza?.hecho].filter(Boolean).length
    const pct = Math.round((tareasDone/8)*100)
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>✅ Tareas del día</h2>
        <TurnoSelector turno={activeTurno} onChange={setActiveTurno} />
        <Card><SectionTitle icon="📊">Progreso</SectionTitle><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{color:"#64748b",fontSize:14}}>{tareasDone} de 8</span><span style={{color:"#6366f1",fontWeight:700,fontSize:14}}>{pct}%</span></div><div style={{background:"#e2e8f0",borderRadius:20,height:12,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#10b981)",borderRadius:20,transition:"width 0.4s"}} /></div></Card>
        <Card><SectionTitle icon="🧹">Limpieza</SectionTitle><CheckBox label="Se ha limpiado" checked={turnoData.limpieza?.hecho||false} onChange={v=>updateTurno("limpieza",{...turnoData.limpieza,hecho:v})} />{turnoData.limpieza?.hecho&&(<div style={{marginTop:12}}><div style={{fontSize:13,fontWeight:600,color:"#64748b",marginBottom:8}}>Zonas:</div><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{ZONAS_LIMPIEZA.map(zona=>(<Pill key={zona} label={zona} active={(turnoData.limpieza?.zonas||[]).includes(zona)} onClick={()=>toggleLimpiezaZona(zona)} />))}</div><textarea value={turnoData.limpieza?.notas||""} onChange={e=>updateTurno("limpieza",{...turnoData.limpieza,notas:e.target.value})} placeholder="Notas de limpieza..." rows={3} style={{...inputStyle,width:"100%",boxSizing:"border-box",resize:"vertical"}} /></div>)}</Card>
        <Card><SectionTitle icon="📦">Almacén y stock</SectionTitle><div style={{display:"flex",flexDirection:"column",gap:8}}><CheckBox label="Repuesto desde fuera" checked={turnoData.repuestoFuera||false} onChange={v=>updateTurno("repuestoFuera",v)} /><CheckBox label="Repuesto desde dentro" checked={turnoData.repuestoDentro||false} onChange={v=>updateTurno("repuestoDentro",v)} /><CheckBox label="Almacén arreglado" checked={turnoData.almacenArreglado||false} onChange={v=>updateTurno("almacenArreglado",v)} /><CheckBox label="Ordenado el almacén" checked={turnoData.ordenadoAlmacen||false} onChange={v=>updateTurno("ordenadoAlmacen",v)} /><CheckBox label="Bajado cajas" checked={turnoData.bajadoCajas||false} onChange={v=>updateTurno("bajadoCajas",v)} /></div></Card>
        <Card><SectionTitle icon="📋">Control y revisión</SectionTitle><div style={{display:"flex",flexDirection:"column",gap:8}}><CheckBox label="Control de stocks" checked={turnoData.stocks||false} onChange={v=>updateTurno("stocks",v)} /><CheckBox label="Revisión de caducidades" checked={turnoData.caducidades||false} onChange={v=>updateTurno("caducidades",v)} /></div></Card>
        <Card>
          <SectionTitle icon="🌡️">Temperatura frigorífico</SectionTitle>
          <CheckBox label="Temperatura registrada" checked={!!(turnoData.temperatura)} onChange={v=>{ if(!v) updateTurno("temperatura",null) }} />
          {(turnoData.temperatura!==null&&turnoData.temperatura!==undefined||true)&&(
            <div style={{marginTop:10,display:"flex",gap:10,alignItems:"center"}}>
              <input type="number" step="0.1" value={turnoData.temperatura||""} onChange={e=>updateTurno("temperatura",e.target.value)} placeholder="Ej: 4.5" style={{padding:"10px 12px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1e293b",background:"#f8fafc",outline:"none",flex:1,boxSizing:"border-box"}} />
              <span style={{fontSize:14,color:"#64748b",fontWeight:600}}>°C</span>
              {turnoData.temperatura&&<span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:parseFloat(turnoData.temperatura)>=2&&parseFloat(turnoData.temperatura)<=8?"#d1fae5":"#fee2e2",color:parseFloat(turnoData.temperatura)>=2&&parseFloat(turnoData.temperatura)<=8?"#065f46":"#dc2626"}}>{parseFloat(turnoData.temperatura)>=2&&parseFloat(turnoData.temperatura)<=8?"✓ OK":"⚠️ Fuera de rango"}</span>}
            </div>
          )}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>Rango correcto: 2°C – 8°C</div>
        </Card>
        <button onClick={saveDay} disabled={saving} style={{background:saving?"#a5b4fc":"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6366f144"}}>{saving?"⏳ Guardando...":"💾 Guardar turno"}</button>
        {savedMsg&&<div style={{textAlign:"center",color:savedMsg.startsWith("✓")?"#10b981":"#ef4444",fontWeight:700,fontSize:14}}>{savedMsg}</div>}
      </div>
    )
  }

  // ── RENDER CHAT ──────────────────────────────────────────────
  const renderChat = () => (
    <div style={{display:"flex",flexDirection:"column",height:"70vh"}}>
      <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b",marginBottom:12}}>💬 Chat del equipo</h2>
      {!chatUser?(
        <Card><SectionTitle icon="👤">¿Quién eres?</SectionTitle><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{EQUIPO.map(n=>(<button key={n} onClick={()=>setChatUser(n)} style={{padding:"10px 18px",borderRadius:30,fontSize:14,fontWeight:600,cursor:"pointer",background:"#f8fafc",color:"#64748b",border:"2px solid #e2e8f0",fontFamily:"inherit"}}>{n}</button>))}</div></Card>
      ):(
        <>
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:12}}>
            {chatMessages.length===0&&<EmptyState text="Sin mensajes todavía. ¡Sé la primera!" />}
            {chatMessages.map(msg=>{const isMe=msg.autor===chatUser;return(<div key={msg.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}><div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",background:isMe?"linear-gradient(135deg,#6366f1,#818cf8)":"#fff",color:isMe?"#fff":"#1e293b",boxShadow:"0 2px 8px #0001",border:isMe?"none":"1px solid #f1f5f9"}}>{!isMe&&<div style={{fontSize:11,fontWeight:700,color:"#8b5cf6",marginBottom:4}}>{msg.autor}</div>}<div style={{fontSize:14}}>{msg.texto}</div><div style={{fontSize:11,opacity:0.7,marginTop:4,textAlign:"right"}}>{msg.fecha}</div></div></div>)})}
            <div ref={chatEndRef} />
          </div>
          <div style={{display:"flex",gap:8,paddingTop:12,borderTop:"1px solid #f1f5f9"}}>
            <div style={{fontSize:12,color:"#8b5cf6",fontWeight:600,alignSelf:"center",minWidth:50}}>{chatUser}</div>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Escribe un mensaje..." style={{...inputStyle,flex:1}} />
            <button onClick={sendMessage} style={{...addBtnStyle,padding:"10px 16px"}}>Enviar</button>
          </div>
          <button onClick={()=>setChatUser("")} style={{marginTop:8,background:"none",border:"none",color:"#94a3b8",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cambiar de usuario</button>
        </>
      )}
    </div>
  )

  // ── RENDER HISTORIAL ─────────────────────────────────────────
  const renderHistorial = () => {
    if(editingHistorialDay){
      const d=editingHistorialDay
      const updateH=(turno,key,value)=>setEditingHistorialDay(prev=>prev?{...prev,turnos:{...prev.turnos,[turno]:{...(prev.turnos?.[turno]||emptyTurno()),[key]:value}}}:null)
      const HCB=({label,checked,onChange})=>(<button onClick={()=>onChange(!checked)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:checked?"#d1fae5":"#fff",border:`2px solid ${checked?"#10b981":"#e2e8f0"}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:14,color:checked?"#065f46":"#475569",fontWeight:checked?600:400,width:"100%",textAlign:"left"}}><span style={{fontSize:18}}>{checked?"✅":"⬜"}</span>{label}</button>)
      const td=d.turnos?.[selectedDayTurno]||emptyTurno()
      return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setEditingHistorialDay(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>← Cancelar</button><h2 style={{fontSize:16,fontWeight:800,color:"#1e293b",flex:1}}>✏️ Editar jornada</h2></div>
          <TurnoSelector turno={selectedDayTurno} onChange={setSelectedDayTurno} />
          <Card><SectionTitle icon="📋">Datos</SectionTitle><div style={{display:"flex",flexDirection:"column",gap:10}}><select value={td.responsable||""} onChange={e=>updateH(selectedDayTurno,"responsable",e.target.value)} style={{...inputStyle,width:"100%",boxSizing:"border-box"}}><option value="">Responsable...</option>{EQUIPO.map(n=><option key={n} value={n}>{n}</option>)}</select><textarea value={td.notaTraspaso||""} onChange={e=>updateH(selectedDayTurno,"notaTraspaso",e.target.value)} placeholder="Nota de traspaso..." rows={2} style={{...inputStyle,width:"100%",boxSizing:"border-box",resize:"vertical"}} /></div></Card>
          <Card><SectionTitle icon="📦">Pedidos</SectionTitle>{(td.pedidos||[]).map((p,i)=>(<div key={i} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:10}}><div style={{display:"flex",flexDirection:"column",gap:6}}><input value={p.proveedor||""} onChange={e=>{const arr=[...td.pedidos];arr[i]={...arr[i],proveedor:e.target.value};updateH(selectedDayTurno,"pedidos",arr)}} placeholder="Proveedor" style={{...inputStyle,width:"100%",boxSizing:"border-box"}} /><select value={p.estado||"Recibido"} onChange={e=>{const arr=[...td.pedidos];arr[i]={...arr[i],estado:e.target.value};updateH(selectedDayTurno,"pedidos",arr)}} style={{...inputStyle,width:"100%",boxSizing:"border-box"}}>{ESTADOS_PEDIDO.map(o=><option key={o} value={o}>{o}</option>)}</select><button onClick={()=>updateH(selectedDayTurno,"pedidos",td.pedidos.filter((_,j)=>j!==i))} style={{background:"#fee2e2",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:"#ef4444",alignSelf:"flex-start"}}>🗑 Eliminar</button></div></div>))}<button onClick={()=>updateH(selectedDayTurno,"pedidos",[...(td.pedidos||[]),{id:Date.now(),proveedor:"",estado:"Recibido"}])} style={addBtnStyle}>+ Añadir pedido</button></Card>
          <Card><SectionTitle icon="✅">Tareas</SectionTitle><div style={{display:"flex",flexDirection:"column",gap:8}}><HCB label="Limpieza" checked={td.limpieza?.hecho||false} onChange={v=>updateH(selectedDayTurno,"limpieza",{...td.limpieza,hecho:v})} /><HCB label="Repuesto desde fuera" checked={td.repuestoFuera||false} onChange={v=>updateH(selectedDayTurno,"repuestoFuera",v)} /><HCB label="Repuesto desde dentro" checked={td.repuestoDentro||false} onChange={v=>updateH(selectedDayTurno,"repuestoDentro",v)} /><HCB label="Almacén arreglado" checked={td.almacenArreglado||false} onChange={v=>updateH(selectedDayTurno,"almacenArreglado",v)} /><HCB label="Ordenado almacén" checked={td.ordenadoAlmacen||false} onChange={v=>updateH(selectedDayTurno,"ordenadoAlmacen",v)} /><HCB label="Bajado cajas" checked={td.bajadoCajas||false} onChange={v=>updateH(selectedDayTurno,"bajadoCajas",v)} /><HCB label="Control de stocks" checked={td.stocks||false} onChange={v=>updateH(selectedDayTurno,"stocks",v)} /><HCB label="Revisión caducidades" checked={td.caducidades||false} onChange={v=>updateH(selectedDayTurno,"caducidades",v)} /></div></Card>
          <div style={{display:"flex",gap:10}}><button onClick={()=>setEditingHistorialDay(null)} style={{flex:1,padding:12,border:"2px solid #e2e8f0",borderRadius:10,background:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",color:"#64748b"}}>Cancelar</button><button onClick={()=>saveHistorialDay(d)} style={{flex:2,padding:12,border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Guardar</button></div>
        </div>
      )
    }
    if(selectedDay){
      const d=selectedDay
      const td=d.turnos?.[selectedDayTurno]||emptyTurno()
      const tareasDone=[td.stocks,td.caducidades,td.almacenArreglado,td.repuestoFuera,td.repuestoDentro,td.ordenadoAlmacen,td.bajadoCajas,td.limpieza?.hecho].filter(Boolean).length
      return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><button onClick={()=>setSelectedDay(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>← Volver</button><h2 style={{fontSize:14,fontWeight:800,color:"#1e293b",flex:1}}>{d.fecha}</h2><button onClick={()=>setEditingHistorialDay({...d})} style={{background:"#eff6ff",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#3b82f6"}}>✏️ Editar</button>{isAdmin&&<button onClick={()=>deleteDay(d.fechaKey)} style={{background:"#fee2e2",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#ef4444"}}>🗑</button>}</div>
          <TurnoSelector turno={selectedDayTurno} onChange={setSelectedDayTurno} />
          <Card><SectionTitle icon="📋">Resumen</SectionTitle><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{td.responsable&&<Badge text={td.responsable} color="#8b5cf6" />}<Badge text={`✅ ${tareasDone}/8`} color="#10b981" /><Badge text={`📦 ${(td.pedidos||[]).length}`} color="#3b82f6" /><Badge text={`⚠️ ${(td.incidencias||[]).length}`} color="#f59e0b" /></div>{td.notaTraspaso&&<div style={{marginTop:10,padding:"8px 12px",background:"#fffbeb",borderRadius:8,fontSize:13,color:"#92400e"}}>📝 {td.notaTraspaso}</div>}{td.temperatura&&<div style={{marginTop:8}}><Badge text={`🌡️ ${td.temperatura}°C`} color={parseFloat(td.temperatura)>=2&&parseFloat(td.temperatura)<=8?"#10b981":"#ef4444"} /></div>}</Card>
          {(td.pedidos||[]).length>0&&<Card><SectionTitle icon="📦">Pedidos</SectionTitle>{td.pedidos.map((p,i)=>(<div key={i} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:8}}><div style={{fontWeight:700,fontSize:14}}>{p.proveedor}</div>{p.descripcion&&<div style={{fontSize:13,color:"#64748b"}}>{p.descripcion}</div>}<div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><Badge text={p.estado} color={colorEstado[p.estado]||"#6366f1"} /></div></div>))}</Card>}
          {(td.incidencias||[]).length>0&&<Card><SectionTitle icon="⚠️">Incidencias</SectionTitle>{td.incidencias.map((inc,i)=>(<div key={i} style={{padding:"10px 14px",background:"#fffbeb",borderRadius:10,marginBottom:8,borderLeft:"3px solid #f59e0b"}}><div style={{fontWeight:700,color:"#92400e",fontSize:14}}>{inc.tipo}</div><div style={{fontSize:13,color:"#64748b"}}>{inc.descripcion}</div>{inc.resuelta&&<Badge text="✓ Resuelta" color="#10b981" />}</div>))}</Card>}
          <Card><SectionTitle icon="✅">Tareas</SectionTitle><div style={{display:"flex",flexDirection:"column",gap:6}}>{[{label:"Limpieza",done:td.limpieza?.hecho},{label:"Repuesto fuera",done:td.repuestoFuera},{label:"Repuesto dentro",done:td.repuestoDentro},{label:"Almacén arreglado",done:td.almacenArreglado},{label:"Ordenado almacén",done:td.ordenadoAlmacen},{label:"Bajado cajas",done:td.bajadoCajas},{label:"Control stocks",done:td.stocks},{label:"Caducidades",done:td.caducidades}].map(({label,done})=>(<div key={label} style={{display:"flex",alignItems:"center",gap:8,fontSize:14,color:done?"#065f46":"#94a3b8"}}><span>{done?"✅":"⬜"}</span>{label}</div>))}</div></Card>
        </div>
      )
    }
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>📋 Historial</h2>
        <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Buscar por fecha, responsable, proveedor..." style={{...inputStyle,width:"100%",boxSizing:"border-box"}} />
        {filteredHistorial.length===0&&<EmptyState text="No hay jornadas guardadas" />}
        {filteredHistorial.map(day=>(
          <Card key={day.fechaKey} style={{borderLeft:"4px solid #6366f1",cursor:"pointer"}}>
            <div onClick={()=>setSelectedDay(day)}>
              <div style={{fontWeight:700,color:"#6366f1",fontSize:14}}>{day.fecha||day.fechaKey}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                {["manana","tarde"].map(t=>{
                  const td=day.turnos?.[t]||emptyTurno()
                  return(<div key={t} style={{background:t==="manana"?"#fffbeb":"#eef2ff",borderRadius:10,padding:"8px 10px",border:`1px solid ${t==="manana"?"#fde68a":"#c7d2fe"}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:t==="manana"?"#92400e":"#4338ca",marginBottom:4}}>{t==="manana"?"☀️ Mañana":"🌙 Tarde"}</div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}><Badge text={`📦${(td.pedidos||[]).length}`} color="#3b82f6" /><Badge text={`⚠️${(td.incidencias||[]).length}`} color="#f59e0b" /></div>
                    {td.responsable&&<div style={{fontSize:11,color:"#64748b",marginTop:4}}>{td.responsable}</div>}
                  </div>)
                })}
              </div>
              <div style={{marginTop:8,fontSize:12,color:"#a5b4fc",fontWeight:600}}>Toca para ver el detalle →</div>
            </div>
            {isAdmin&&<button onClick={()=>deleteDay(day.fechaKey)} style={{marginTop:10,background:"#fee2e2",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:"#ef4444"}}>🗑 Borrar jornada</button>}
          </Card>
        ))}
      </div>
    )
  }

  // ── RENDER ADMIN ─────────────────────────────────────────────
  const renderAdmin = () => {
    if(!isAdmin) return null
    const last7 = historial.slice(0,7)
    const tempData = historial.slice(0,14).flatMap(d=>
      ["manana","tarde"].map(t=>{
        const td=d.turnos?.[t]||emptyTurno()
        if(!td.temperatura) return null
        return {fecha:`${d.fechaKey} ${t==="manana"?"☀️":"🌙"}`,temp:parseFloat(td.temperatura),ok:parseFloat(td.temperatura)>=2&&parseFloat(td.temperatura)<=8}
      }).filter(Boolean)
    )
    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>👑 Panel Admin</h2>
          <Badge text="Antonio" color="#6366f1" />
        </div>

        {/* Tablón de anuncios */}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <SectionTitle icon="📢">Tablón de anuncios</SectionTitle>
            <button onClick={()=>setShowAnuncioForm(!showAnuncioForm)} style={addBtnStyle}>+ Nuevo</button>
          </div>
          {showAnuncioForm&&(
            <div style={{background:"#f8fafc",borderRadius:12,padding:16,marginBottom:14,display:"flex",flexDirection:"column",gap:10}}>
              <input value={newAnuncio.titulo} onChange={e=>setNewAnuncio(p=>({...p,titulo:e.target.value}))} placeholder="Título del anuncio *" style={{...inputStyle,width:"100%",boxSizing:"border-box"}} />
              <textarea value={newAnuncio.texto} onChange={e=>setNewAnuncio(p=>({...p,texto:e.target.value}))} placeholder="Descripción (opcional)..." rows={2} style={{...inputStyle,width:"100%",boxSizing:"border-box",resize:"vertical"}} />
              <select value={newAnuncio.tipo} onChange={e=>setNewAnuncio(p=>({...p,tipo:e.target.value}))} style={{...inputStyle,width:"100%",boxSizing:"border-box"}}>
                <option value="info">📢 Información</option>
                <option value="urgente">🚨 Urgente</option>
                <option value="recordatorio">📌 Recordatorio</option>
              </select>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setShowAnuncioForm(false)} style={{flex:1,padding:10,border:"2px solid #e2e8f0",borderRadius:10,background:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",color:"#64748b"}}>Cancelar</button>
                <button onClick={addAnuncio} style={{flex:2,padding:10,border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>Publicar</button>
              </div>
            </div>
          )}
          {anuncios.length===0&&<EmptyState text="Sin anuncios activos" />}
          {anuncios.map(a=>(
            <div key={a.id} style={{padding:"10px 14px",background:colorAnuncio[a.tipo]+"11",borderRadius:10,marginBottom:8,borderLeft:`3px solid ${colorAnuncio[a.tipo]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{iconAnuncio[a.tipo]} {a.titulo}</div>{a.texto&&<div style={{fontSize:13,color:"#64748b",marginTop:2}}>{a.texto}</div>}<div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{a.fecha}</div></div>
                <button onClick={()=>deleteAnuncio(a.id)} style={deleteBtnStyle}>✕</button>
              </div>
            </div>
          ))}
        </Card>

        {/* Resumen hoy */}
        <Card>
          <SectionTitle icon="📊">Resumen de hoy</SectionTitle>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {["manana","tarde"].map(t=>{
              const td=dayData.turnos?.[t]||emptyTurno()
              const tareas=[td.stocks,td.caducidades,td.almacenArreglado,td.repuestoFuera,td.repuestoDentro,td.ordenadoAlmacen,td.bajadoCajas,td.limpieza?.hecho].filter(Boolean).length
              return(
                <div key={t} style={{background:t==="manana"?"#fffbeb":"#eef2ff",borderRadius:12,padding:14,border:`1px solid ${t==="manana"?"#fde68a":"#c7d2fe"}`}}>
                  <div style={{fontWeight:700,color:t==="manana"?"#92400e":"#4338ca",fontSize:13,marginBottom:8}}>{t==="manana"?"☀️ Mañana":"🌙 Tarde"}</div>
                  {td.responsable&&<div style={{fontSize:12,color:"#64748b",marginBottom:6}}>👤 {td.responsable}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <div style={{fontSize:12,color:"#3b82f6"}}>📦 {(td.pedidos||[]).length} pedidos</div>
                    <div style={{fontSize:12,color:"#f59e0b"}}>⚠️ {(td.incidencias||[]).length} incidencias</div>
                    <div style={{fontSize:12,color:"#10b981"}}>✅ {tareas}/8 tareas</div>
                    {td.temperatura&&<div style={{fontSize:12,color:parseFloat(td.temperatura)>=2&&parseFloat(td.temperatura)<=8?"#10b981":"#ef4444"}}>🌡️ {td.temperatura}°C</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Temperaturas recientes */}
        {tempData.length>0&&(
          <Card>
            <SectionTitle icon="🌡️">Registro de temperaturas</SectionTitle>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {tempData.slice(0,10).map((t,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:t.ok?"#f0fdf4":"#fef2f2",borderRadius:8,border:`1px solid ${t.ok?"#bbf7d0":"#fecaca"}`}}>
                  <span style={{fontSize:13,color:"#64748b"}}>{t.fecha}</span>
                  <Badge text={`${t.temp}°C`} color={t.ok?"#10b981":"#ef4444"} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actividad semana */}
        <Card>
          <SectionTitle icon="📅">Últimos 7 días</SectionTitle>
          {last7.map(day=>{
            const m=day.turnos?.manana||emptyTurno()
            const t=day.turnos?.tarde||emptyTurno()
            return(
              <div key={day.fechaKey} onClick={()=>{setSelectedDay(day);setActiveTab("historial")}} style={{padding:"10px 14px",background:"#f8fafc",borderRadius:10,marginBottom:8,cursor:"pointer"}}>
                <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:6}}>{day.fecha||day.fechaKey}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {m.responsable&&<Badge text={`☀️ ${m.responsable}`} color="#f59e0b" />}
                  {t.responsable&&<Badge text={`🌙 ${t.responsable}`} color="#6366f1" />}
                  <Badge text={`📦 ${(m.pedidos||[]).length+(t.pedidos||[]).length}`} color="#3b82f6" />
                  <Badge text={`⚠️ ${(m.incidencias||[]).length+(t.incidencias||[]).length}`} color="#f59e0b" />
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    )
  }

  // ── RENDER MODAL ─────────────────────────────────────────────
  const renderModal = () => {
    if(!showModal) return null
    const inputS={...inputStyle,width:"100%",boxSizing:"border-box"}
    const configs = {
      pedido:{title:editingItem?"✏️ Editar pedido":"📦 Nuevo pedido",fields:[{key:"proveedor",label:"Proveedor *",type:"text",placeholder:"Ej: Cofares, Hefame..."},{key:"descripcion",label:"Descripción",type:"text",placeholder:"Artículos o notas"},{key:"estado",label:"Estado *",type:"select",options:ESTADOS_PEDIDO},{key:"responsable",label:"Responsable",type:"select",options:EQUIPO},{key:"incidencia",label:"¿Tiene incidencia?",type:"checkbox"},{key:"notaIncidencia",label:"Nota de incidencia",type:"text",placeholder:"Describe la incidencia",hidden:!formData.incidencia},{key:"fotos",label:"📸 Fotos",type:"fotos"}],onSave:()=>addItem("pedidos")},
      incidencia:{title:editingItem?"✏️ Editar incidencia":"⚠️ Nueva incidencia",fields:[{key:"tipo",label:"Tipo *",type:"select",options:["Cliente","Stock","Proveedor","Técnica","Personal","Otro"]},{key:"descripcion",label:"Descripción *",type:"textarea",placeholder:"Describe la incidencia..."},{key:"responsable",label:"Responsable",type:"select",options:EQUIPO},{key:"resuelta",label:"¿Resuelta?",type:"checkbox"},{key:"fotos",label:"📸 Fotos",type:"fotos"}],onSave:()=>addItem("incidencias")},
      encargo:{title:editingItem?"✏️ Editar encargo":"🧪 Encargo especial",fields:[{key:"descripcion",label:"Descripción *",type:"text",placeholder:"Qué se encarga..."},{key:"cliente",label:"Cliente",type:"text",placeholder:"Nombre del cliente"},{key:"responsable",label:"Responsable",type:"select",options:EQUIPO},{key:"estado",label:"Estado",type:"select",options:["Pendiente","En gestión","Listo","Entregado"]}],onSave:()=>addItem("encargos")},
      vacuna:{title:editingItem?"✏️ Editar vacuna":"💉 Vacuna",fields:[{key:"vacuna",label:"Vacuna *",type:"text",placeholder:"Nombre de la vacuna"},{key:"cliente",label:"Cliente",type:"text",placeholder:"Nombre del cliente"},{key:"dosis",label:"Dosis",type:"text",placeholder:"Ej: 1ª dosis"},{key:"responsable",label:"Responsable",type:"select",options:EQUIPO},{key:"estado",label:"Estado",type:"select",options:["Pendiente","En camino","Recibida","Dispensada"]}],onSave:()=>addItem("vacunas")},
      formula:{title:editingItem?"✏️ Editar fórmula":"⚗️ Fórmula magistral",fields:[{key:"formula",label:"Fórmula *",type:"text",placeholder:"Nombre/descripción"},{key:"cliente",label:"Cliente",type:"text",placeholder:"Nombre del cliente"},{key:"laboratorio",label:"Laboratorio",type:"text",placeholder:"Laboratorio preparador"},{key:"responsable",label:"Responsable",type:"select",options:EQUIPO},{key:"estado",label:"Estado",type:"select",options:["Encargada","En preparación","Lista","Recogida"]}],onSave:()=>addItem("formulasMagistrales")},
    }
    const cfg=configs[showModal]
    if(!cfg) return null
    return (
      <div style={{position:"fixed",inset:0,background:"#0008",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&closeModal()}>
        <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",animation:"slideUp 0.3s ease"}}>
          <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>{cfg.title}</h3><button onClick={closeModal} style={{background:"#f1f5f9",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button></div>
          {cfg.fields.filter(f=>!f.hidden).map(field=>(
            <div key={field.key} style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:6}}>{field.label}</label>
              {field.type==="text"&&<input value={formData[field.key]||""} onChange={e=>setFormData(p=>({...p,[field.key]:e.target.value}))} placeholder={field.placeholder} style={inputS} />}
              {field.type==="textarea"&&<textarea value={formData[field.key]||""} onChange={e=>setFormData(p=>({...p,[field.key]:e.target.value}))} placeholder={field.placeholder} rows={3} style={{...inputS,resize:"vertical"}} />}
              {field.type==="select"&&<select value={formData[field.key]||""} onChange={e=>setFormData(p=>({...p,[field.key]:e.target.value}))} style={inputS}><option value="">Seleccionar...</option>{field.options.map(o=><option key={o} value={o}>{o}</option>)}</select>}
              {field.type==="checkbox"&&<CheckBox label={field.label} checked={!!formData[field.key]} onChange={v=>setFormData(p=>({...p,[field.key]:v}))} />}
              {field.type==="fotos"&&<FotoUploader fotos={formData[field.key]||[]} onChange={urls=>setFormData(p=>({...p,[field.key]:urls}))} />}
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button onClick={closeModal} style={{flex:1,padding:12,border:"2px solid #e2e8f0",borderRadius:10,background:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",color:"#64748b"}}>Cancelar</button>
            <button onClick={cfg.onSave} style={{flex:2,padding:12,border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer"}}>{editingItem?"Guardar cambios":"Guardar"}</button>
          </div>
        </div>
      </div>
    )
  }

  // ── ANÁLISIS DE MARCA ───────────────────────────────────────
  const CRITERIOS_MARCA = [
    {id:"ubicacion",    icon:"🔍", label:"Ubicación en el lineal",    desc:"Posición y altura (nivel ojos, inferior, superior)."},
    {id:"visibilidad",  icon:"👁️", label:"Visibilidad y acceso",       desc:"¿Es fácil de ver y alcanzar? ¿Está bien iluminado?"},
    {id:"presentacion", icon:"🖥️", label:"Presentación de productos",  desc:"Orden y presentación (homogeneidad, limpieza, facing correcto)."},
    {id:"variedad",     icon:"📊", label:"Variedad y gama ofrecida",   desc:"¿Están representadas todas las líneas de la marca?"},
    {id:"rotacion",     icon:"🔄", label:"Rotación y ventas (ABC)",    desc:"Productos A / B / C. % del total del lineal ocupado."},
    {id:"stock",        icon:"📦", label:"Stock y disponibilidad",     desc:"¿Se detectan roturas de stock?"},
    {id:"plv",          icon:"🎯", label:"Material PLV",               desc:"Displays, testers, cartelería de la marca."},
    {id:"ofertas",      icon:"🏷️", label:"Ofertas y promociones",      desc:"¿Hay ofertas o promociones destacadas?"},
    {id:"competencia",  icon:"🏪", label:"Competencia adyacente",      desc:"¿Qué marcas están cerca? Comparativa con competencia."},
    {id:"formacion",    icon:"👤", label:"Formación del equipo",       desc:"¿El equipo conoce bien la marca?"},
    {id:"pricing",      icon:"💶", label:"Información y pricing",      desc:"Precios e información clara y visible."},
    {id:"reposicion",   icon:"🔃", label:"Rotación y reposición",      desc:"Caducidades y aplicación del FEFO."},
    {id:"eventualidades",icon:"⚠️",label:"Eventualidades",             desc:"Comentarios y problemas de clientes."},
    {id:"mejoras",      icon:"💡", label:"Sugerencias de mejora",      desc:"Propuestas de mejora para el lineal."},
  ]



  const getRatingColor = (r) => r==="✓"?"#10b981":r==="~"?"#f59e0b":r==="✗"?"#ef4444":"#94a3b8"
  const getRatingBg    = (r) => r==="✓"?"#d1fae5":r==="~"?"#fef3c7":r==="✗"?"#fee2e2":"#f8fafc"
  const calcScore = (data) => {
    if(!data) return null
    const ratings = Object.values(data).map(v=>v?.rating).filter(Boolean)
    if(ratings.length===0) return null
    return Math.round((ratings.reduce((acc,r)=>acc+(r==="✓"?2:r==="~"?1:0),0)/(ratings.length*2))*100)
  }
  const saveMarca = async(persona,marca,data) => {
    if(!marca||!marca.trim()){ setSavedMsg("⚠️ Escribe el nombre de la marca primero"); setTimeout(()=>setSavedMsg(""),3000); return }
    try{
      await setDoc(doc(db,"marca",`${persona}_${todayKey()}`),{persona,marca:marca.trim(),fecha:todayKey(),fechaLabel:todayLabel(),data,updatedAt:new Date().toISOString()})
      setMarcaNombres(prev=>({...prev,[persona]:marca.trim()}))
      setSavedMsg("✓ Análisis guardado")
      setTimeout(()=>setSavedMsg(""),2000)
    }catch{ setSavedMsg("❌ Error al guardar") }
  }
  const [marcaPersona,  setMarcaPersona]  = useState(EQUIPO[0])
  const [marcaNombre,   setMarcaNombre]   = useState("")
  const [marcaHistorial,setMarcaHistorial]= useState([])
  const [marcaView,     setMarcaView]     = useState("hoy")
  const [marcaDetalle,  setMarcaDetalle]  = useState(null)
  const [marcaData,     setMarcaData]     = useState({})
  const [marcaNombres,  setMarcaNombres]  = useState({})

  useEffect(()=>{
    if(!role) return
    const q = query(collection(db,"marca"),orderBy("fecha","desc"))
    const unsub = onSnapshot(q,(snap)=>{
      const entries = snap.docs.map(d=>({id:d.id,...d.data()}))
      setMarcaHistorial(entries)
      const byPersona = {}
      const byNombre = {}
      entries.forEach(e=>{
        if(e.marca) byNombre[e.persona] = e.marca
        if(e.fecha===todayKey()) byPersona[e.persona]=e.data||{}
      })
      setMarcaData(byPersona)
      setMarcaNombres(byNombre)
    })
    return ()=>unsub()
  },[role])

  const renderMarca = () => {
    const marca = marcaNombres[marcaPersona]||""
    const marcaActual = marcaNombre||marca
    const todayData = marcaData[marcaPersona]||{}
    const scoreHoy = calcScore(todayData)
    const personaHist = marcaHistorial.filter(e=>e.persona===marcaPersona).sort((a,b)=>b.fecha.localeCompare(a.fecha))
    const last10 = [...personaHist].reverse().slice(-10)
    const updateField = (id,field,value) => setMarcaData(prev=>({...prev,[marcaPersona]:{...(prev[marcaPersona]||{}),[id]:{...(prev[marcaPersona]?.[id]||{}),[field]:value}}}))

    if(marcaView==="evolucion") return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setMarcaView("hoy")} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>← Volver</button>
          <div><div style={{fontSize:16,fontWeight:800,color:"#1e293b"}}>{marcaPersona}</div><div style={{fontSize:12,color:"#6366f1",fontWeight:600}}>{marca}</div></div>
        </div>
        {last10.length<2
          ?<div style={{textAlign:"center",padding:"40px 20px",color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:8}}>📊</div>Necesitas al menos 2 análisis para ver la evolución</div>
          :<>
            <Card>
              <SectionTitle icon="📈">Evolución de puntuación</SectionTitle>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {last10.map((entry,i)=>{
                  const s=calcScore(entry.data); if(s===null) return null
                  const prev=i>0?calcScore(last10[i-1].data):null
                  const trend=prev!==null?(s>prev?"↗️":s<prev?"↘️":"→"):""
                  return (<div key={entry.id} onClick={()=>{setMarcaDetalle(entry);setMarcaView("detalle")}} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"8px 4px",borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{width:52,fontSize:12,color:"#64748b",fontWeight:600,flexShrink:0}}>{entry.fecha.slice(8)}/{entry.fecha.slice(5,7)}</div>
                    <div style={{flex:1,height:10,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}><div style={{width:`${s}%`,height:"100%",background:s>=70?"#10b981":s>=40?"#f59e0b":"#ef4444",borderRadius:20}} /></div>
                    <div style={{fontSize:13,fontWeight:800,color:s>=70?"#10b981":s>=40?"#f59e0b":"#ef4444",minWidth:36,textAlign:"right"}}>{s}%</div>
                    <div style={{fontSize:14,minWidth:20}}>{trend}</div>
                  </div>)
                })}
              </div>
            </Card>
            <Card>
              <SectionTitle icon="🔍">Progreso por criterio</SectionTitle>
              {CRITERIOS_MARCA.map(c=>(
                <div key={c.id} style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1e293b",marginBottom:6}}>{c.icon} {c.label}</div>
                  <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                    {last10.map((e,i)=>{const r=(e.data||{})[c.id]?.rating||null;return(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{width:26,height:26,borderRadius:8,background:r?getRatingBg(r):"#f1f5f9",border:`1px solid ${r?getRatingColor(r)+"55":"#e2e8f0"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:r?getRatingColor(r):"#cbd5e1"}}>{r||"·"}</div>
                        <div style={{fontSize:8,color:"#94a3b8",marginTop:2}}>{e.fecha.slice(8)}/{e.fecha.slice(5,7)}</div>
                      </div>
                    )})}
                  </div>
                </div>
              ))}
            </Card>
          </>
        }
      </div>
    )

    if(marcaView==="detalle"&&marcaDetalle) {
      const e=marcaDetalle; const s=calcScore(e.data)
      return (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setMarcaView("historial");setMarcaDetalle(null)}} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>← Volver</button>
            <div style={{flex:1}}><div style={{fontWeight:800,color:"#1e293b",fontSize:15}}>{e.marca}</div><div style={{fontSize:12,color:"#94a3b8"}}>{e.fechaLabel||e.fecha} · {e.persona}</div></div>
            {s!==null&&<span style={{fontSize:15,fontWeight:800,padding:"5px 12px",borderRadius:20,background:s>=70?"#d1fae5":s>=40?"#fef3c7":"#fee2e2",color:s>=70?"#065f46":s>=40?"#92400e":"#dc2626"}}>{s}%</span>}
          </div>
          {CRITERIOS_MARCA.map(c=>{const val=(e.data||{})[c.id]||{};if(!val.rating&&!val.obs) return null;return(
            <Card key={c.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:val.obs?8:0}}>
                <div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{c.icon} {c.label}</div>
                {val.rating&&<span style={{padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:700,background:getRatingBg(val.rating),color:getRatingColor(val.rating)}}>{val.rating}</span>}
              </div>
              {val.obs&&<div style={{fontSize:13,color:"#64748b",lineHeight:1.5}}>{val.obs}</div>}
            </Card>
          )})}
        </div>
      )
    }

    if(marcaView==="historial") return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setMarcaView("hoy")} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#64748b"}}>← Volver</button>
          <div><div style={{fontSize:16,fontWeight:800,color:"#1e293b"}}>{marcaPersona} · {marca}</div><div style={{fontSize:12,color:"#94a3b8"}}>{personaHist.length} análisis guardados</div></div>
        </div>
        {personaHist.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:8}}>📭</div>Sin análisis anteriores</div>}
        {personaHist.map(entry=>{
          const s=calcScore(entry.data); const n=Object.values(entry.data||{}).filter(v=>v?.rating).length
          return (<Card key={entry.id} style={{cursor:"pointer"}} onClick={()=>{setMarcaDetalle(entry);setMarcaView("detalle")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{entry.fechaLabel||entry.fecha}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{n} de 14 criterios evaluados</div></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {s!==null&&<span style={{fontSize:14,fontWeight:800,padding:"4px 10px",borderRadius:20,background:s>=70?"#d1fae5":s>=40?"#fef3c7":"#fee2e2",color:s>=70?"#065f46":s>=40?"#92400e":"#dc2626"}}>{s}%</span>}
                <span style={{color:"#94a3b8",fontSize:20}}>›</span>
              </div>
            </div>
          </Card>)
        })}
      </div>
    )

    // Vista principal HOY
    return (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <h2 style={{fontSize:18,fontWeight:800,color:"#1e293b"}}>🏷️ Análisis de marca</h2>
        {/* Selector persona + nombre de marca */}
        <Card>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:6,display:"block"}}>Responsable</label>
              <select value={marcaPersona} onChange={e=>{setMarcaPersona(e.target.value);setMarcaNombre("");setMarcaView("hoy")}} style={{padding:"10px 12px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1e293b",background:"#f8fafc",outline:"none",width:"100%",boxSizing:"border-box"}}>
                {EQUIPO.map(n=><option key={n} value={n}>{n}{marcaNombres[n]?` — ${marcaNombres[n]}`:""}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:6,display:"block"}}>Marca asignada</label>
              <input
                value={marcaNombre||(marcaNombres[marcaPersona]||"")}
                onChange={e=>setMarcaNombre(e.target.value)}
                placeholder="Escribe el nombre de la marca..."
                style={{padding:"10px 12px",border:"2px solid #e2e8f0",borderRadius:10,fontSize:14,fontFamily:"inherit",color:"#1e293b",background:"#f8fafc",outline:"none",width:"100%",boxSizing:"border-box"}}
              />
            </div>
          </div>
        </Card>
        <Card style={{background:"linear-gradient(135deg,#1e293b,#334155)",border:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-0.5}}>{marcaActual||"—"}</div>
              <div style={{fontSize:13,color:"#94a3b8",marginTop:2}}>Responsable: {marcaPersona}</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:1}}>{todayLabel()}</div>
            </div>
            {scoreHoy!==null&&(
              <div style={{textAlign:"center",background:scoreHoy>=70?"#064e3b":scoreHoy>=40?"#78350f":"#7f1d1d",borderRadius:16,padding:"10px 16px"}}>
                <div style={{fontSize:30,fontWeight:900,color:scoreHoy>=70?"#10b981":scoreHoy>=40?"#f59e0b":"#ef4444"}}>{scoreHoy}%</div>
                <div style={{fontSize:10,color:"#94a3b8"}}>hoy</div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={()=>setMarcaView("historial")} style={{flex:1,padding:"9px 0",background:"#ffffff15",border:"1px solid #ffffff25",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",color:"#e2e8f0",fontFamily:"inherit"}}>📋 Historial</button>
            <button onClick={()=>setMarcaView("evolucion")} style={{flex:1,padding:"9px 0",background:"#ffffff15",border:"1px solid #ffffff25",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",color:"#e2e8f0",fontFamily:"inherit"}}>📈 Evolución</button>
          </div>
        </Card>
        {scoreHoy!==null&&(
          <div style={{display:"flex",gap:8}}>
            {[["✓",Object.values(todayData).filter(v=>v?.rating==="✓").length,"#10b981"],["~",Object.values(todayData).filter(v=>v?.rating==="~").length,"#f59e0b"],["✗",Object.values(todayData).filter(v=>v?.rating==="✗").length,"#ef4444"]].map(([r,n,c])=>(
              <div key={r} style={{flex:1,background:c+"11",borderRadius:12,padding:"10px 0",textAlign:"center",border:`1px solid ${c}33`}}>
                <div style={{fontSize:20,fontWeight:900,color:c}}>{n}</div><div style={{fontSize:12,fontWeight:700,color:c}}>{r}</div>
              </div>
            ))}
            <div style={{flex:1,background:"#f8fafc",borderRadius:12,padding:"10px 0",textAlign:"center",border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#94a3b8"}}>{14-Object.values(todayData).filter(v=>v?.rating).length}</div>
              <div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>pendientes</div>
            </div>
          </div>
        )}
        {CRITERIOS_MARCA.map((c,idx)=>{
          const val=todayData[c.id]||{}
          return (
            <Card key={c.id} style={{borderLeft:`4px solid ${val.rating?getRatingColor(val.rating):"#e2e8f0"}`}}>
              <div style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:34,height:34,borderRadius:10,background:val.rating?getRatingBg(val.rating):"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:"#1e293b",fontSize:14}}>{idx+1}. {c.label}</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{c.desc}</div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  {["✓","~","✗"].map(r=>(
                    <button key={r} onClick={()=>updateField(c.id,"rating",val.rating===r?null:r)} style={{width:34,height:34,borderRadius:10,border:`2px solid ${val.rating===r?getRatingColor(r):"#e2e8f0"}`,cursor:"pointer",fontWeight:900,fontSize:15,background:val.rating===r?getRatingBg(r):"#fff",color:val.rating===r?getRatingColor(r):"#cbd5e1",fontFamily:"inherit",transition:"all 0.15s"}}>{r}</button>
                  ))}
                </div>
              </div>
              <textarea value={val.obs||""} onChange={e=>updateField(c.id,"obs",e.target.value)} placeholder={`Observaciones sobre ${c.label.toLowerCase()}...`} rows={2} style={{padding:"8px 12px",border:`2px solid ${val.obs?"#c7d2fe":"#e2e8f0"}`,borderRadius:10,fontSize:13,fontFamily:"inherit",color:"#1e293b",background:val.obs?"#fafbff":"#f8fafc",outline:"none",width:"100%",boxSizing:"border-box",resize:"vertical",lineHeight:1.5}} />
            </Card>
          )
        })}
        <button onClick={()=>saveMarca(marcaPersona,marcaActual,todayData)} style={{background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:12,padding:"14px 20px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #6366f144"}}>💾 Guardar análisis{marcaActual?` de ${marcaActual}`:""}</button>
        {savedMsg&&<div style={{textAlign:"center",color:savedMsg.startsWith("✓")?"#10b981":"#ef4444",fontWeight:700,fontSize:14}}>{savedMsg}</div>}
      </div>
    )
  }

  const tabContent = {resumen:renderResumen,calendario:renderCalendario,pedidos:renderPedidos,incidencias:renderIncidencias,encargos:renderEncargos,tareas:renderTareas,marca:renderMarca,chat:renderChat,historial:renderHistorial,admin:renderAdmin}

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#f8fafc",minHeight:"100vh",maxWidth:520,margin:"0 auto",position:"relative"}}>
      <div style={{background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",padding:"20px 20px 16px",color:"#fff",boxShadow:"0 4px 24px #6366f155"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:28}}>💊</div>
          <div>
            <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5}}>FarmaciaFlow</div>
            <div style={{fontSize:12,opacity:0.85}}>Gestión diaria del equipo</div>
          </div>
          {isAdmin&&<div style={{marginLeft:"auto"}}><Badge text="👑 Admin" color="#fbbf24" /></div>}
          {!isAdmin&&pendientes.length>0&&<div style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700}}>🔔 {pendientes.length}</div>}
        </div>
      </div>
      <div style={{background:"#fff",padding:"0 2px",borderBottom:"1px solid #f1f5f9",display:"flex",overflowX:"auto",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px #0001"}}>
        {tabs.map(tab=>(<button key={tab.id} onClick={()=>{setActiveTab(tab.id);if(tab.id!=="historial"){setSelectedDay(null);setEditingHistorialDay(null)}}} style={{padding:"12px 7px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:10.5,fontWeight:600,whiteSpace:"nowrap",color:activeTab===tab.id?"#6366f1":"#94a3b8",borderBottom:`2px solid ${activeTab===tab.id?"#6366f1":"transparent"}`,transition:"all 0.2s"}}>{tab.label}</button>))}
      </div>
      <div style={{padding:16,paddingBottom:40}}>{tabContent[activeTab]?.()}</div>
      {renderModal()}
    </div>
  )
}
