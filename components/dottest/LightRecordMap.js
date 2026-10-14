import { useEffect, useRef } from "react";
import L from "leaflet";
import { formatDate, regionOf } from "@/lib/dottest/records";
import styles from "@/styles/pages/dottest.module.css";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// 같은 지역 기록이 겹치지 않도록 원형으로 살짝 흩어 배치
function spread(records) {
  const byRegion = {};
  return records.map((r) => {
    const i = (byRegion[r.region] = (byRegion[r.region] ?? -1) + 1);
    const base = regionOf(r.region);
    if (i === 0) return { r, lat: base.lat, lng: base.lng };
    const a = i * 2.4;
    const d = 0.22 * Math.sqrt(i);
    return { r, lat: base.lat + Math.sin(a) * d, lng: base.lng + Math.cos(a) * d };
  });
}

export default function LightRecordMap({ records, focusId }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = L.map(elRef.current, {
      center: [36.2, 127.9],
      zoom: 6,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      className: styles.darkTiles,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points = spread(records);
    let focusMarker = null;
    points.forEach(({ r, lat, lng }) => {
      const icon = L.divIcon({
        className: styles.pinWrap,
        html: `<span class="${styles.pin}${r.demo ? "" : ` ${styles.pinMine}`}"></span><span class="${styles.pinLabel}">${escapeHtml(r.date.slice(0, 7).replace("-", "."))}</span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -10],
      });
      const region = regionOf(r.region);
      const marker = L.marker([lat, lng], { icon }).addTo(layer);
      marker.bindPopup(
        `<div class="${styles.popup}">
          ${r.image ? `<img src="${escapeHtml(r.image)}" alt="" />` : ""}
          <p class="${styles.popupMeta}">${escapeHtml(formatDate(r.date))} · ${escapeHtml(region.name)}${r.place ? ` ${escapeHtml(r.place)}` : ""}</p>
          ${r.text ? `<p class="${styles.popupText}">${escapeHtml(r.text)}</p>` : ""}
        </div>`,
        { maxWidth: 220, minWidth: 180, className: styles.popupShell }
      );
      if (r.id === focusId) focusMarker = { marker, lat, lng };
    });

    if (focusMarker) {
      map.setView([focusMarker.lat, focusMarker.lng], 9, { animate: false });
      focusMarker.marker.openPopup();
    } else if (points.length) {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.lat, p.lng])),
        { paddingTopLeft: [40, 30], paddingBottomRight: [70, 110], maxZoom: 9, animate: false }
      );
      if (map.getZoom() < 6) map.setZoom(6, { animate: false });
    }
  }, [records, focusId]);

  return <div ref={elRef} className={styles.map} />;
}
