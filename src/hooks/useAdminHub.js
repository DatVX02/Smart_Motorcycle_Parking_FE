import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";

export function useAdminHub() {

    const connectionRef = useRef(null);

    const [spotsMap, setSpotsMap] = useState({});
    const [occupancyMap, setOccupancyMap] = useState({});
    const [deviceEvents, setDeviceEvents] = useState([]);
    const [sessionEvents, setSessionEvents] = useState([]);
    const [hubStatus, setHubStatus] = useState("idle"); // idle | connecting | connected | reconnecting | disconnected | error
    const [connectionId, setConnectionId] = useState(null);
    const [adminJoined, setAdminJoined] = useState(false);

    useEffect(() => {

        const apiBaseUrl =
            (import.meta?.env?.VITE_API_BASE_URL || "https://localhost:7015").replace(/\/+$/, "");
        const hubUrl = `${apiBaseUrl}/hubs/parking`;
        setHubStatus("connecting");
        setConnectionId(null);
        setAdminJoined(false);

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => localStorage.getItem("access_token") ?? ""
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        connectionRef.current = connection;

        // system events (as in the test HTML)
        connection.on("Connected", (id) => {
            setConnectionId(id ?? null);
        });
        connection.on("JoinedAdminGroup", () => {
            setAdminJoined(true);
        });
        connection.on("LeftAdminGroup", () => {
            setAdminJoined(false);
        });

        // available spots
        connection.on("AvailableSpotsUpdate", (data) => {

            console.log("AvailableSpotsUpdate:", data);

            setSpotsMap(prev => ({
                ...prev,
                [data.lotId]: data.realAvailableSpots ?? data.availableSpots
            }));

            setOccupancyMap(prev => ({
                ...prev,
                [data.lotId]: data.occupancyPercentage
            }));

        });

        // vehicle checkin / checkout
        connection.on("SessionUpdate", (data) => {

            console.log("SessionUpdate:", data);

            setSessionEvents(prev =>
                [data, ...prev].slice(0, 50)
            );

        });

        // occupancy
        connection.on("OccupancyRateUpdate", (data) => {

            setOccupancyMap(prev => ({
                ...prev,
                [data.lotId]: data.occupancyPercentage
            }));

        });

        // device alert
        connection.on("DeviceStatusUpdate", (data) => {

            console.log("DeviceStatusUpdate:", data);

            setDeviceEvents(prev =>
                [data, ...prev].slice(0, 50)
            );

        });

        // custom admin event from DeviceEventController
        connection.on("DeviceEventRaised", (data) => {

            console.log("DeviceEventRaised:", data);

            setDeviceEvents(prev =>
                [data, ...prev].slice(0, 50)
            );

        });

        connection.start()
            .then(() => {

                console.log("✅ SignalR Connected:", hubUrl);
                setHubStatus("connected");

                return connection.invoke("JoinAdminGroup");

            })
            .then(() => {
                setAdminJoined(true);
            })
            .catch(err => {
                console.error("SignalR connect error:", err);
                setHubStatus("error");
            });

        connection.onclose((err) => {
            console.error("SignalR closed:", err ?? "(no error)");
            setHubStatus("disconnected");
            setConnectionId(null);
            setAdminJoined(false);
        });

        connection.onreconnecting((err) => {
            console.warn("SignalR reconnecting:", err ?? "(no error)");
            setHubStatus("reconnecting");
        });

        connection.onreconnected(() => {

            console.log("🔁 SignalR Reconnected");
            setHubStatus("connected");

            connection.invoke("JoinAdminGroup");

        });

        return () => {

            connection.off("Connected");
            connection.off("JoinedAdminGroup");
            connection.off("LeftAdminGroup");
            connection.off("AvailableSpotsUpdate");
            connection.off("SessionUpdate");
            connection.off("OccupancyRateUpdate");
            connection.off("DeviceStatusUpdate");
            connection.off("DeviceEventRaised");

            connection.stop();

        };


    }, []);

    return {
        spotsMap,
        occupancyMap,
        deviceEvents,
        sessionEvents,
        hubStatus,
        connectionId,
        adminJoined
    };
}
