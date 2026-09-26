import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Location from "expo-location";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView } from "react-native-webview";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Platform.select({
    android: "http://10.0.2.2:3000/api",
    ios: "http://localhost:3000/api",
    default: "http://192.168.1.9:3000/api",
  });

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const OPENROUTESERVICE_KEY =
  process.env.EXPO_PUBLIC_OPENROUTESERVICE_KEY ||
  process.env.OPENROUTESERVICE_KEY ||
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJmMDc4NmQ1NzMxMjQ2NjI5Y2ZhOGNhZjA2NGM4Y2E0IiwiaCI6Im11cm11cjY0In0=";

const getOpenRouteServiceHeaders = () => ({
  Accept: "application/json, application/geo+json",
  "Content-Type": "application/json",
  ...(OPENROUTESERVICE_KEY ? { Authorization: OPENROUTESERVICE_KEY } : {}),
});

const MOCK_MISSING_PEOPLE = [
  {
    id: "person-1",
    name: "Lucas Martins",
    description: "Última vez visto perto do terminal de ônibus às 18h30.",
    lastKnownLocation: "Terminal Norte",
    date: "2026-09-18",
    latitude: -23.55052,
    longitude: -46.633308,
  },
  {
    id: "person-2",
    name: "Ana Souza",
    description: "Vestia jaqueta azul e mochila marrom.",
    lastKnownLocation: "Praça da Sé",
    date: "2026-09-20",
    latitude: -23.5486,
    longitude: -46.6341,
  },
];

const MOCK_MISSING_ANIMALS = [
  {
    id: "animal-1",
    name: "Thor",
    description: "Cão vira-lata, porte médio, coleira vermelha.",
    lastKnownLocation: "Parque da Luz",
    date: "2026-09-19",
    latitude: -23.5553,
    longitude: -46.6407,
  },
  {
    id: "animal-2",
    name: "Mimi",
    description: "Gata siamesa, muito tímida.",
    lastKnownLocation: "Rua do Comércio",
    date: "2026-09-21",
    latitude: -23.5518,
    longitude: -46.6268,
  },
];

const routeColors = {
  low: "#2FBF71",
  medium: "#F7B500",
  high: "#E54B4B",
};

const routeLabels = {
  low: "Rota segura",
  medium: "Rota moderada",
  high: "Rota com atenção",
};

const defaultLocation = {
  latitude: -23.5489,
  longitude: -46.6388,
};

const buildMapHtml = ({ center, markers = [], route = [] }) => {
  const routeCoordinates = JSON.stringify(
    route.map((point) => [point.latitude, point.longitude]),
  );
  const markerData = JSON.stringify(
    markers.map((marker) => ({
      latitude: marker.latitude,
      longitude: marker.longitude,
      title: marker.title || "Ponto",
      color: marker.color || "#1f9d8a",
    })),
  );

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map {
          margin: 0;
          width: 100%;
          height: 100%;
          background: #edf5f7;
        }
        body {
          font-family: Arial, sans-serif;
        }
        .leaflet-container {
          background: #edf5f7;
          border-radius: 18px;
        }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.8) !important;
          border-radius: 10px 0 0 0;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
        }).setView(${JSON.stringify([center.latitude, center.longitude])}, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const routeCoordinates = ${routeCoordinates};
        const markers = ${markerData};

        if (routeCoordinates.length > 1) {
          const routeLine = L.polyline(routeCoordinates, {
            color: '#0f4c5c',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
          map.fitBounds(routeLine.getBounds(), { padding: [28, 28] });
        }

        markers.forEach((marker) => {
          const circle = L.circleMarker([marker.latitude, marker.longitude], {
            color: '#ffffff',
            weight: 2,
            fillColor: marker.color,
            fillOpacity: 0.95,
            radius: 9,
          }).addTo(map);
          circle.bindPopup(marker.title);
        });

        if (markers.length > 0 && routeCoordinates.length <= 1) {
          const bounds = L.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude]));
          map.fitBounds(bounds.pad(0.7), { padding: [30, 30] });
        }

        setTimeout(() => map.invalidateSize(), 200);
        setTimeout(() => map.invalidateSize(), 800);
      </script>
    </body>
  </html>`;
};

function MapPreview({ center, markers = [], route = [] }) {
  return (
    <WebView
      key={`${center.latitude}-${center.longitude}-${route.length}-${markers.length}`}
      originWhitelist={["*"]}
      source={{ html: buildMapHtml({ center, markers, route }) }}
      style={{
        width: "100%",
        height: 260,
        borderRadius: 18,
        overflow: "hidden",
      }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scalesPageToFit
      mixedContentMode="always"
    />
  );
}

const parseErrorMessage = (error) => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (error?.code === "ECONNABORTED" || error?.message === "Network Error") {
    return "Servidor indisponível. Verifique se o backend está rodando e se o IP do app está correto.";
  }
  return error?.message || "Ops, algo deu errado.";
};

const geocodeAddress = async (value) => {
  const parsed = parseCoordinateInput(value, null);
  if (parsed) {
    return parsed;
  }

  const cleanText = String(value || "").trim();
  if (!cleanText) {
    return null;
  }

  if (OPENROUTESERVICE_KEY) {
    try {
      const query = new URLSearchParams({
        api_key: OPENROUTESERVICE_KEY,
        text: cleanText,
        boundary_country: "BR",
        language: "pt",
      });

      const response = await fetch(
        `https://api.openrouteservice.org/geocode/search?${query.toString()}`,
        {
          headers: {
            Accept: "application/json, application/geo+json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const firstFeature = data?.features?.[0];
        if (firstFeature?.geometry?.coordinates) {
          const [longitude, latitude] = firstFeature.geometry.coordinates;
          return { latitude: Number(latitude), longitude: Number(longitude) };
        }
      }
    } catch (error) {
      console.log("ORS geocode fallback failed:", error?.message || error);
    }
  }

  const query = encodeURIComponent(cleanText);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Não foi possível localizar esse endereço.");
  }

  const data = await response.json();
  if (!data || !data[0]) {
    return null;
  }

  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
  };
};

const fetchRoutePath = async (origin, destination) => {
  const routePayload = {
    coordinates: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
    format: "geojson",
    units: "km",
  };

  if (OPENROUTESERVICE_KEY) {
    try {
      const response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: getOpenRouteServiceHeaders(),
          body: JSON.stringify(routePayload),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const coordinates = data?.features?.[0]?.geometry?.coordinates || [];

        if (coordinates.length) {
          return coordinates.map(([longitude, latitude]) => ({
            latitude,
            longitude,
          }));
        }
      }
    } catch (error) {
      console.log("ORS route failed, falling back:", error?.message || error);
    }
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(osrmUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text || "Não foi possível calcular a rota com as APIs disponíveis.",
    );
  }

  const data = await response.json();
  const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];

  if (!coordinates.length) {
    return [
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude },
    ];
  }

  return coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
};

const getSeverityLevel = (value) => {
  if (!value) return "medium";
  if (value === "high") return "high";
  if (value === "low") return "low";
  return "medium";
};

const computeDistanceKm = (origin, destination) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(destination.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (earthRadius * c).toFixed(1);
};

function useAppSession() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("communiwatch_token");
        if (!savedToken) {
          setLoading(false);
          return;
        }

        const response = await api.get("/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        setToken(savedToken);
        setUser(response.data.user);
      } catch (error) {
        await AsyncStorage.removeItem("communiwatch_token");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  return { token, setToken, user, setUser, loading };
}

function AuthScreen({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@communiwatch.com");
  const [password, setPassword] = useState("Admin123!");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && !name)) {
      setMessage("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister
        ? { name, email, password, role: "resident" }
        : { email, password };

      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;

      await AsyncStorage.setItem("communiwatch_token", token);
      onLoginSuccess(token, user);
    } catch (error) {
      setMessage(parseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.authTitle}>ComuniWatch</Text>
      <Text style={styles.authSubtitle}>
        Segurança, mobilidade e comunidade
      </Text>

      {isRegister ? (
        <TextInput
          style={styles.field}
          value={name}
          placeholder="Seu nome"
          onChangeText={setName}
        />
      ) : null}

      <TextInput
        style={styles.field}
        value={email}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.field}
        value={password}
        placeholder="Senha"
        secureTextEntry
        onChangeText={setPassword}
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegister ? "Criar conta" : "Entrar"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister((prev) => !prev)}>
        <Text style={styles.linkText}>
          {isRegister ? "Já tenho conta" : "Criar nova conta"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const parseCoordinateInput = (value, fallback) => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  const match = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/,
  );

  if (match) {
    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  }

  return fallback;
};

function HomeScreen({
  user,
  communities,
  reports,
  refreshData,
  location,
  missingPeople,
  missingAnimals,
}) {
  const [region, setRegion] = useState({
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    setRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }, [location]);

  const markers = [
    ...reports.map((report) => ({
      ...report,
      latitude: Number(report.latitude ?? location.latitude),
      longitude: Number(report.longitude ?? location.longitude),
      color:
        getSeverityLevel(report.severity) === "high"
          ? "#E54B4B"
          : getSeverityLevel(report.severity) === "medium"
            ? "#F7B500"
            : "#2FBF71",
      title: report.title,
    })),
    ...missingPeople.map((person) => ({
      ...person,
      latitude: Number(person.latitude ?? location.latitude),
      longitude: Number(person.longitude ?? location.longitude),
      color: "#FF8A00",
      title: `${person.name} (desaparecido)`,
    })),
    ...missingAnimals.map((animal) => ({
      ...animal,
      latitude: Number(animal.latitude ?? location.latitude),
      longitude: Number(animal.longitude ?? location.longitude),
      color: "#7C3AED",
      title: `${animal.name} (animal desaparecido)`,
    })),
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.sectionLabel}>Bem-vindo</Text>
          <Text style={styles.title}>{user?.name || "Usuário"}</Text>
        </View>
        <Text style={styles.statusBadge}>Local ativo</Text>
      </View>

      <View style={styles.mapCard}>
        <MapPreview
          center={location}
          markers={markers.map((item) => ({
            latitude: item.latitude,
            longitude: item.longitude,
            title: item.title,
            color: item.color,
          }))}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Comunidades</Text>
          <Text style={styles.summaryValue}>{communities.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Ocorrências</Text>
          <Text style={styles.summaryValue}>{reports.length}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ocorrências na região</Text>
        {reports.length ? (
          reports.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.mutedText}>{item.category}</Text>
              <Text style={styles.mutedText}>
                {item.address || "Localização não informada"}
              </Text>
              <Text style={styles.mutedText}>Status: {item.status}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Nenhuma ocorrência registrada nessa região.
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={refreshData}>
        <Text style={styles.buttonText}>Atualizar dados</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function RoutePlannerScreen({ reports, location }) {
  const [originText, setOriginText] = useState("Minha localização");
  const [destinationText, setDestinationText] = useState(
    "Praça da Sé, São Paulo",
  );
  const [origin, setOrigin] = useState({
    latitude: location.latitude,
    longitude: location.longitude,
  });
  const [destination, setDestination] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
  });
  const [routeMap, setRouteMap] = useState([
    { latitude: location.latitude, longitude: location.longitude },
    { latitude: -23.55052, longitude: -46.633308 },
  ]);
  const [routeMessage, setRouteMessage] = useState("");
  const [resolving, setResolving] = useState(false);
  const [routeReady, setRouteReady] = useState(true);

  useEffect(() => {
    const nextOrigin = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    setOrigin(nextOrigin);
    setOriginText("Minha localização");
    setRouteMap([
      nextOrigin,
      { latitude: destination.latitude, longitude: destination.longitude },
    ]);
  }, [location]);

  const resolveAddress = async (text, type) => {
    const normalized = typeof text === "string" ? text.trim() : "";

    if (!normalized) {
      return type === "origin" ? origin : destination;
    }

    if (normalized.toLowerCase() === "minha localização") {
      const currentLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      if (type === "origin") setOrigin(currentLocation);
      if (type === "destination") setDestination(currentLocation);
      return currentLocation;
    }

    const parsed = parseCoordinateInput(normalized, null);
    if (parsed) {
      if (type === "origin") setOrigin(parsed);
      if (type === "destination") setDestination(parsed);
      return parsed;
    }

    const resolved = await geocodeAddress(normalized);
    if (!resolved) {
      return type === "origin" ? origin : destination;
    }

    if (type === "origin") setOrigin(resolved);
    if (type === "destination") setDestination(resolved);
    return resolved;
  };

  const handleSearchRoute = async () => {
    if (!originText || !destinationText) {
      setRouteMessage("Informe origem e destino.");
      return;
    }

    setResolving(true);
    setRouteMessage("");

    try {
      const resolvedOrigin = await resolveAddress(originText, "origin");
      const resolvedDestination = await resolveAddress(
        destinationText,
        "destination",
      );

      if (!resolvedOrigin || !resolvedDestination) {
        setRouteMessage(
          "Não foi possível localizar um dos endereços informados.",
        );
        return;
      }

      const path = await fetchRoutePath(resolvedOrigin, resolvedDestination);
      setOrigin(resolvedOrigin);
      setDestination(resolvedDestination);
      setRouteMap(path.length ? path : [resolvedOrigin, resolvedDestination]);
      setRouteReady(true);
    } catch (error) {
      setRouteMessage(error?.message || "Não foi possível resolver a rota.");
    } finally {
      setResolving(false);
    }
  };

  const mapCenter = routeReady
    ? {
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2,
      }
    : {
        latitude: location.latitude,
        longitude: location.longitude,
      };

  const nearReports = reports.filter((report) => {
    if (!report.latitude || !report.longitude) return false;
    return (
      Math.abs(Number(report.latitude) - destination.latitude) < 0.08 &&
      Math.abs(Number(report.longitude) - destination.longitude) < 0.08
    );
  });

  const riskLevel = useMemo(() => {
    if (!nearReports.length) return "low";
    const levels = nearReports.map((item) => getSeverityLevel(item.severity));
    const highCount = levels.filter((level) => level === "high").length;
    const mediumCount = levels.filter((level) => level === "medium").length;
    if (highCount > 0 || mediumCount >= 2) return "high";
    if (mediumCount > 0) return "medium";
    return "low";
  }, [nearReports]);

  const distance = useMemo(
    () => computeDistanceKm(origin, destination),
    [origin, destination],
  );
  const duration = Math.max(5, Math.round((Number(distance) / 4.4) * 60));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Planejar rota</Text>

        <TextInput
          style={styles.field}
          value={originText}
          onChangeText={setOriginText}
          placeholder="Origem (endereço ou coordenadas)"
        />
        <TextInput
          style={styles.field}
          value={destinationText}
          onChangeText={setDestinationText}
          placeholder="Destino (endereço ou coordenadas)"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSearchRoute}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Buscar rota</Text>
          )}
        </TouchableOpacity>

        {routeMessage ? (
          <Text style={styles.message}>{routeMessage}</Text>
        ) : null}

        <View
          style={[
            styles.routeBadge,
            { backgroundColor: routeColors[riskLevel] },
          ]}
        >
          <Text style={styles.routeBadgeText}>{routeLabels[riskLevel]}</Text>
        </View>

        <Text style={styles.routeMeta}>Distância: {distance} km</Text>
        <Text style={styles.routeMeta}>Tempo estimado: {duration} min</Text>
        <Text style={styles.mutedText}>
          Ocorrências próximas: {nearReports.length}
        </Text>
      </View>

      <View style={styles.mapCard}>
        <MapPreview
          center={mapCenter}
          markers={[
            {
              latitude: origin.latitude,
              longitude: origin.longitude,
              title: "Origem",
              color: "#1f9d8a",
            },
            {
              latitude: destination.latitude,
              longitude: destination.longitude,
              title: "Destino",
              color: "#0f4c5c",
            },
          ]}
          route={routeMap}
        />
      </View>
    </ScrollView>
  );
}

function ReportsScreen({ navigation, reports, refreshData, token }) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Ocorrências</Text>
        <TouchableOpacity
          style={styles.secondaryButtonSmall}
          onPress={() => navigation.navigate("NewReport")}
        >
          <Text style={styles.buttonText}>+ Registrar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.screenContent}>
        {reports.length ? (
          reports.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.mutedText}>{item.category}</Text>
              <Text style={styles.mutedText}>{item.description}</Text>
              <Text style={styles.mutedText}>Status: {item.status}</Text>
              <Text style={styles.mutedText}>
                {item.address || "Sem endereço"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Nenhuma ocorrência disponível no momento.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function NewReportScreen({ navigation, token, refreshData, location }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("road");
  const [severity, setSeverity] = useState("medium");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!title || !description) {
      setMessage("Título e descrição são obrigatórios.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      await api.post(
        "/reports",
        {
          title,
          description,
          category,
          severity,
          latitude: location.latitude,
          longitude: location.longitude,
          address: address || "Localização atual",
          communityId: null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage("Ocorrência registrada com sucesso!");
      setTitle("");
      setDescription("");
      setAddress("");
      await refreshData();
      navigation.goBack();
    } catch (error) {
      setMessage(parseErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <Text style={styles.title}>Registrar ocorrência</Text>

      <TextInput
        style={styles.field}
        value={title}
        onChangeText={setTitle}
        placeholder="Título da ocorrência"
      />
      <TextInput
        style={[styles.field, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Descreva o ocorrido"
        multiline
      />
      <TextInput
        style={styles.field}
        value={category}
        onChangeText={setCategory}
        placeholder="Categoria"
      />
      <TextInput
        style={styles.field}
        value={severity}
        onChangeText={setSeverity}
        placeholder="Severidade (low, medium, high)"
      />
      <TextInput
        style={styles.field}
        value={address}
        onChangeText={setAddress}
        placeholder="Endereço ou referência"
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Salvar ocorrência</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function NewMissingScreen({ navigation, onAddMissing }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("pessoa");
  const [description, setDescription] = useState("");
  const [lastKnownLocation, setLastKnownLocation] = useState("");
  const [date, setDate] = useState("2026-09-26");

  const handleSubmit = () => {
    if (!name || !description || !lastKnownLocation) {
      return;
    }

    const newItem = {
      id: `${type}-${Date.now()}`,
      name,
      description,
      lastKnownLocation,
      date: date || new Date().toISOString().slice(0, 10),
      latitude: defaultLocation.latitude,
      longitude: defaultLocation.longitude,
    };

    onAddMissing?.(type, newItem);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <Text style={styles.title}>Registrar desaparecido</Text>

      <TextInput
        style={styles.field}
        value={name}
        onChangeText={setName}
        placeholder="Nome ou apelido"
      />
      <TextInput
        style={styles.field}
        value={type}
        onChangeText={setType}
        placeholder="Tipo: pessoa ou animal"
      />
      <TextInput
        style={[styles.field, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Descrição"
        multiline
      />
      <TextInput
        style={styles.field}
        value={lastKnownLocation}
        onChangeText={setLastKnownLocation}
        placeholder="Última localização conhecida"
      />
      <TextInput
        style={styles.field}
        value={date}
        onChangeText={setDate}
        placeholder="Data"
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Salvar desaparecido</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MissingScreen({
  navigation,
  missingPeople,
  missingAnimals,
  onAddMissing,
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Desaparecidos</Text>
        <TouchableOpacity
          style={styles.secondaryButtonSmall}
          onPress={() => navigation.navigate("NewMissing")}
        >
          <Text style={styles.buttonText}>+ Registrar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pessoas desaparecidas</Text>
        {missingPeople.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.name}</Text>
            <Text style={styles.mutedText}>{item.description}</Text>
            <Text style={styles.mutedText}>
              Última localização: {item.lastKnownLocation}
            </Text>
            <Text style={styles.mutedText}>Data: {item.date}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Animais desaparecidos</Text>
        {missingAnimals.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.name}</Text>
            <Text style={styles.mutedText}>{item.description}</Text>
            <Text style={styles.mutedText}>
              Última localização: {item.lastKnownLocation}
            </Text>
            <Text style={styles.mutedText}>Data: {item.date}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.listTitle}>{user?.name || "Usuário"}</Text>
        <Text style={styles.mutedText}>
          {user?.email || "E-mail não informado"}
        </Text>
        <Text style={styles.mutedText}>Cargo: {user?.role || "resident"}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onLogout}>
        <Text style={styles.buttonText}>Encerrar sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MainTabs({
  token,
  user,
  reports,
  communities,
  location,
  refreshData,
  onLogout,
  missingPeople,
  missingAnimals,
  onAddMissing,
}) {
  const ReportsStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="ReportsList" options={{ headerShown: false }}>
        {(props) => (
          <ReportsScreen
            {...props}
            token={token}
            reports={reports}
            refreshData={refreshData}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="NewReport" options={{ title: "Nova ocorrência" }}>
        {(props) => (
          <NewReportScreen
            {...props}
            token={token}
            refreshData={refreshData}
            location={location}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );

  const MissingStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="MissingList" options={{ headerShown: false }}>
        {(props) => (
          <MissingScreen
            {...props}
            missingPeople={missingPeople}
            missingAnimals={missingAnimals}
            onAddMissing={onAddMissing}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="NewMissing" options={{ title: "Novo desaparecido" }}>
        {(props) => <NewMissingScreen {...props} onAddMissing={onAddMissing} />}
      </Stack.Screen>
    </Stack.Navigator>
  );

  const renderTabIcon = (routeName, color, size) => {
    const icons = {
      Início: "🏠",
      Rotas: "🗺️",
      Ocorrências: "⚠️",
      Desaparecidos: "🔎",
      Perfil: "👤",
    };

    return (
      <Text style={{ color, fontSize: size, textAlign: "center" }}>
        {icons[routeName] || "•"}
      </Text>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0f4c5c", borderTopWidth: 0 },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#b3d6d9",
        tabBarIcon: ({ color, size }) => renderTabIcon(route.name, color, size),
      })}
    >
      <Tab.Screen name="Início" options={{ tabBarLabel: "Início" }}>
        {(props) => (
          <HomeScreen
            {...props}
            user={user}
            communities={communities}
            reports={reports}
            refreshData={refreshData}
            location={location}
            missingPeople={missingPeople}
            missingAnimals={missingAnimals}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Rotas" options={{ tabBarLabel: "Rotas" }}>
        {(props) => (
          <RoutePlannerScreen
            {...props}
            reports={reports}
            location={location}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Ocorrências"
        component={ReportsStack}
        options={{ tabBarLabel: "Ocorrências" }}
      />
      <Tab.Screen
        name="Desaparecidos"
        component={MissingStack}
        options={{ tabBarLabel: "Desaparecidos" }}
      />
      <Tab.Screen name="Perfil" options={{ tabBarLabel: "Perfil" }}>
        {(props) => (
          <ProfileScreen {...props} user={user} onLogout={onLogout} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { token, setToken, user, setUser, loading } = useAppSession();
  const [reports, setReports] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [missingPeople, setMissingPeople] = useState(MOCK_MISSING_PEOPLE);
  const [missingAnimals, setMissingAnimals] = useState(MOCK_MISSING_ANIMALS);
  const [location, setLocation] = useState(defaultLocation);

  const loadData = async (authToken) => {
    try {
      const [communitiesRes, reportsRes] = await Promise.all([
        api.get("/communities", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        api.get("/reports", {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      setCommunities(communitiesRes.data.communities || []);
      setReports(reportsRes.data.reports || []);
    } catch (error) {
      console.log("Load data error", parseErrorMessage(error));
    }
  };

  useEffect(() => {
    const fetchCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    };

    fetchCurrentLocation();
  }, []);

  useEffect(() => {
    if (token) {
      loadData(token);
    }
  }, [token]);

  const handleLoginSuccess = async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    await loadData(nextToken);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("communiwatch_token");
    setToken(null);
    setUser(null);
    setReports([]);
    setCommunities([]);
  };

  const handleAddMissing = (type, item) => {
    if (type === "animal") {
      setMissingAnimals((prev) => [item, ...prev]);
      return;
    }

    setMissingPeople((prev) => [item, ...prev]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f9d8a" />
        <Text style={styles.loadingText}>Carregando ComuniWatch...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!token ? (
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <MainTabs
            token={token}
            user={user}
            reports={reports}
            communities={communities}
            location={location}
            refreshData={() => loadData(token)}
            onLogout={handleLogout}
            missingPeople={missingPeople}
            missingAnimals={missingAnimals}
            onAddMissing={handleAddMissing}
          />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6faf9",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f7f7",
  },
  authTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#163a3a",
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 18,
    color: "#567071",
    marginBottom: 20,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f6faf9",
  },
  screenContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#163a3a",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#6b7d7d",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  field: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dfe9e8",
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  message: {
    color: "#0a6a58",
    fontWeight: "700",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#1f9d8a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonSmall: {
    backgroundColor: "#0f4c5c",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  linkText: {
    marginTop: 16,
    textAlign: "center",
    color: "#0f4c5c",
    fontWeight: "700",
  },
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5efee",
    marginBottom: 18,
  },
  map: {
    height: 260,
    width: "100%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5efee",
  },
  summaryLabel: {
    color: "#607778",
    fontSize: 12,
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#163a3a",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5efee",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#17353a",
    marginBottom: 12,
  },
  listItem: {
    backgroundColor: "#f5faf9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14373a",
    marginBottom: 4,
  },
  mutedText: {
    color: "#52686a",
    marginBottom: 4,
  },
  emptyText: {
    color: "#607778",
    fontStyle: "italic",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  statusBadge: {
    backgroundColor: "#dff5ef",
    color: "#0b7b6f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  routeBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  routeBadgeText: {
    color: "#fff",
    fontWeight: "700",
  },
  routeMeta: {
    color: "#234a4d",
    fontWeight: "600",
    marginBottom: 4,
  },
  loadingText: {
    marginTop: 12,
    color: "#163a3a",
    fontSize: 16,
  },
});
