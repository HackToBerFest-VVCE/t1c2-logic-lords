// OpenLens Archy - Architecture Dataset & Presets
// Implements exact schema for the Dual-Stage AUV Architecture and OpenLens System

export const ARCHITECTURE_PRESETS = {
  auv_defense: {
    id: "auv_defense",
    name: "AUV Autonomous Defense - Dual-Stage AI Pipeline",
    description: "Multi-agent subsea exploration and acoustic anomaly detection architecture with air-gapped security boundaries.",
    boundaries: [
      {
        id: "multi_agent",
        label: "Multi-Agent Advisory System",
        x: 350,
        y: 30,
        width: 480,
        height: 140,
        color: "rgba(224, 140, 40, 0.8)",
        fill: "rgba(224, 140, 40, 0.04)",
        borderStyle: "dashed"
      },
      {
        id: "security_boundary",
        label: "Air-Gapped Defense — SECRET//NOFORN",
        x: 230,
        y: 190,
        width: 175,
        height: 380,
        color: "rgba(239, 68, 68, 0.8)",
        fill: "rgba(239, 68, 68, 0.03)",
        borderStyle: "dashed"
      },
      {
        id: "inference_pipeline",
        label: "Dual-Stage AI Inference Pipeline",
        x: 440,
        y: 190,
        width: 200,
        height: 440,
        color: "rgba(224, 140, 40, 0.8)",
        fill: "rgba(224, 140, 40, 0.03)",
        borderStyle: "dashed"
      },
      {
        id: "sensing_nav",
        label: "Advanced Sensing & Navigation",
        x: 820,
        y: 190,
        width: 280,
        height: 570,
        color: "rgba(224, 140, 40, 0.8)",
        fill: "rgba(224, 140, 40, 0.03)",
        borderStyle: "dashed"
      },
      {
        id: "data_analytics",
        label: "Data & Analytics Layer",
        x: 230,
        y: 650,
        width: 820,
        height: 270,
        color: "rgba(224, 140, 40, 0.8)",
        fill: "rgba(224, 140, 40, 0.03)",
        borderStyle: "dashed"
      }
    ],
    nodes: [
      // External actors
      {
        id: "auv_operator",
        label: "AUV Operator",
        file: "Human-in-loop",
        layer: "external",
        icon: "user",
        x: 35,
        y: 430,
        width: 120,
        height: 60,
        details: "Tactical commander console providing human authorization and mission directive overrides."
      },
      {
        id: "sonar_array",
        label: "Sonar Array",
        file: "Side-scan / multibeam",
        layer: "external",
        icon: "radio",
        x: 35,
        y: 560,
        width: 120,
        height: 60,
        details: "High-frequency side-scan sonar transducer generating acoustic return waveforms."
      },

      // Multi-Agent Advisory System
      {
        id: "nav_agent",
        label: "Nav Agent",
        file: "P1/P2/P3",
        layer: "backend",
        icon: "code",
        x: 380,
        y: 60,
        width: 120,
        height: 60,
        details: "Calculates waypoint paths and avoidance maneuvers across P1/P2/P3 safety tiers."
      },
      {
        id: "risk_agent",
        label: "Risk Agent",
        file: "Env risk",
        layer: "backend",
        icon: "code",
        x: 525,
        y: 60,
        width: 120,
        height: 60,
        details: "Real-time threat assessment agent factoring acoustic signatures and battery thresholds."
      },
      {
        id: "briefing_agent",
        label: "Briefing Agent",
        file: "Mission",
        layer: "backend",
        icon: "code",
        x: 670,
        y: 60,
        width: 120,
        height: 60,
        details: "Generates situational briefing summaries for tactical logging and command uplink."
      },

      // Security Layer
      {
        id: "security_layer",
        label: "Security Layer",
        file: "security.py",
        layer: "security",
        icon: "shield",
        x: 260,
        y: 220,
        width: 135,
        height: 65,
        details: "Cryptographic HMAC verification, secret rotation, and mTLS boundary enforcement."
      },

      // Frontend & Gateways
      {
        id: "streamlit_dash",
        label: "Streamlit Dashboard",
        file: "dashboard.py",
        layer: "frontend",
        icon: "layout",
        x: 260,
        y: 430,
        width: 135,
        height: 65,
        details: "Real-time telemetry and 3D subsea anomaly visualization interface."
      },
      {
        id: "fastapi_api",
        label: "FastAPI REST API",
        file: "api.py · :8000",
        layer: "backend",
        icon: "code",
        x: 260,
        y: 550,
        width: 135,
        height: 65,
        details: "High-throughput asynchronous ingest API with strict schema validation."
      },

      // Inference & Agent Cluster
      {
        id: "auv_agents",
        label: "AUV Agents",
        file: "agents.py",
        layer: "backend",
        icon: "code",
        x: 470,
        y: 430,
        width: 135,
        height: 65,
        details: "Autonomous coordinator reconciling advisory signals with vehicle actuator commands."
      },
      {
        id: "preprocessing",
        label: "Preprocessing",
        file: "preprocessing.py",
        layer: "backend",
        icon: "code",
        x: 470,
        y: 550,
        width: 135,
        height: 65,
        details: "FFT acoustic normalization, noise filtering, and beamforming feature transforms."
      },
      {
        id: "sonar_bus",
        label: "Sonar Bus",
        file: "sonar_bus.py",
        layer: "backend",
        icon: "code",
        x: 260,
        y: 685,
        width: 135,
        height: 60,
        details: "ZeroMQ / shared-memory queue for streaming hydrophone frame buffers."
      },
      {
        id: "telemetry",
        label: "Telemetry",
        file: "telemetry.py",
        layer: "backend",
        icon: "code",
        x: 470,
        y: 685,
        width: 135,
        height: 60,
        details: "IMU, depth pressure, temperature, and battery telemetry aggregator."
      },

      // Central Inference Engine & Models
      {
        id: "conv_autoencoder",
        label: "ConvAutoencoder",
        file: "model.py · .pth",
        layer: "database",
        icon: "database",
        x: 690,
        y: 335,
        width: 145,
        height: 65,
        details: "PyTorch 1D/2D CNN autoencoder trained on acoustic baseline clutter for anomaly detection."
      },
      {
        id: "inference_engine",
        label: "Inference Engine",
        file: "infer.py Stage 1+2",
        layer: "backend",
        icon: "code",
        x: 690,
        y: 490,
        width: 145,
        height: 65,
        details: "Dual-stage inference pipeline executing real-time classification and reconstruction error analysis."
      },
      {
        id: "feature_extractor",
        label: "Feature Extractor",
        file: "features.py",
        layer: "backend",
        icon: "code",
        x: 715,
        y: 555,
        width: 110,
        height: 60,
        details: "Mel-spectrogram, wave energy, and harmonic frequency spectrum feature calculator."
      },

      // Advanced Sensing & Navigation
      {
        id: "geotagging",
        label: "Geotagging",
        file: "geotagging.py",
        layer: "backend",
        icon: "code",
        x: 910,
        y: 220,
        width: 110,
        height: 60,
        details: "Correlates acoustic contact timestamps with GPS/INS dead reckoning coordinates."
      },
      {
        id: "space_surv",
        label: "Space Surv.",
        file: "space_surveillance.py",
        layer: "backend",
        icon: "code",
        x: 1045,
        y: 220,
        width: 115,
        height: 60,
        details: "Satellite SAR/AIS overlay fusion for surface maritime contact correlation."
      },
      {
        id: "confidence",
        label: "Confidence",
        file: "confidence.py",
        layer: "backend",
        icon: "code",
        x: 910,
        y: 350,
        width: 110,
        height: 60,
        details: "Bayesian confidence estimator weighting SNR, temporal consistency, and spatial overlap."
      },
      {
        id: "vehicle_dynamics",
        label: "Vehicle Dynamics",
        file: "vehicle_dynamics.py",
        layer: "backend",
        icon: "code",
        x: 1045,
        y: 350,
        width: 115,
        height: 60,
        details: "Hydrodynamic 6-DOF thruster response model and ballast state estimator."
      },
      {
        id: "acoustic_physics",
        label: "Acoustic Physics",
        file: "acoustic_physics.py",
        layer: "backend",
        icon: "code",
        x: 970,
        y: 555,
        width: 115,
        height: 60,
        details: "Sound velocity profile (SVP) refraction and thermocline shadow zone ray tracer."
      },
      {
        id: "subsea_nav",
        label: "Subsea Nav",
        file: "subsea_navigation.py",
        layer: "backend",
        icon: "code",
        x: 970,
        y: 685,
        width: 115,
        height: 60,
        details: "Doppler Velocity Log (DVL) and acoustic transponder SLAM dead-reckoning engine."
      },

      // Data & Analytics Layer
      {
        id: "event_logger",
        label: "Event Logger",
        file: "logger.py · CSV",
        layer: "database",
        icon: "database",
        x: 690,
        y: 685,
        width: 140,
        height: 60,
        details: "Structured tamper-evident audit log recording detected anomalies and operator decisions."
      },
      {
        id: "heatmap",
        label: "Heatmap",
        file: "heatmap.py",
        layer: "frontend",
        icon: "layout",
        x: 855,
        y: 685,
        width: 100,
        height: 60,
        details: "Geospatial bathymetric heat map rendering anomaly density and track history."
      },
      {
        id: "temporal_ai",
        label: "Temporal AI",
        file: "temporal_ai.py",
        layer: "backend",
        icon: "code",
        x: 690,
        y: 830,
        width: 130,
        height: 60,
        details: "LSTM/Transformer analyzing multi-hour trend divergence in background ocean noise."
      },
      {
        id: "accumulation",
        label: "Accumulation",
        file: "accumulation.py",
        layer: "backend",
        icon: "code",
        x: 845,
        y: 830,
        width: 115,
        height: 60,
        details: "Rolling statistics and drift tracker across consecutive subsea dive transects."
      },
      {
        id: "data_store",
        label: "Data Store",
        file: "data/ · models/",
        layer: "database",
        icon: "database",
        x: 470,
        y: 830,
        width: 135,
        height: 60,
        details: "Versioned local storage for acoustic spectrogram snapshots and neural model weights."
      },
      {
        id: "training_pipeline",
        label: "Training Pipeline",
        file: "train.py",
        layer: "backend",
        icon: "code",
        x: 260,
        y: 830,
        width: 135,
        height: 60,
        details: "Offline model retraining and weight quantization pipeline run during docking cycles."
      }
    ],
    connections: [
      // Operator and Sonar Inputs
      {
        id: "c1",
        from: "auv_operator",
        to: "streamlit_dash",
        label: "monitors",
        style: "solid",
        color: "#10b981",
        protocol: "WebSockets / HTTPS",
        description: "Operator reviews real-time vehicle status and issues override directives."
      },
      {
        id: "c2",
        from: "sonar_array",
        to: "sonar_bus",
        label: "raw frames",
        style: "solid",
        color: "#10b981",
        protocol: "DMA / Raw UDP",
        description: "Digitized acoustic frame samples transferred directly from transducer bus."
      },

      // Security Enforcement
      {
        id: "c3",
        from: "security_layer",
        to: "streamlit_dash",
        label: "HMAC verify",
        style: "dashed",
        color: "#ef4444",
        protocol: "HMAC-SHA256",
        description: "Validates signed cryptographic tokens before granting mission command access."
      },
      {
        id: "c4",
        from: "security_layer",
        to: "fastapi_api",
        label: "policy check",
        style: "dashed",
        color: "#ef4444",
        protocol: "Internal SPIFFE/mTLS",
        description: "Enforces air-gapped zero-trust boundary on REST endpoints."
      },

      // API Ingest & Bus
      {
        id: "c5",
        from: "sonar_bus",
        to: "fastapi_api",
        label: "frame",
        style: "solid",
        color: "#38bdf8",
        protocol: "IPC Queue",
        description: "Batched acoustic frames pushed to API worker pool for indexing."
      },
      {
        id: "c6",
        from: "fastapi_api",
        to: "preprocessing",
        label: "sonar frame",
        style: "solid",
        color: "#38bdf8",
        protocol: "gRPC",
        description: "Frames streamed to signal processing stage for beamforming."
      },
      {
        id: "c7",
        from: "preprocessing",
        to: "auv_agents",
        label: "cleaned",
        style: "solid",
        color: "#10b981",
        protocol: "In-Memory Buffer",
        description: "Noise-filtered spectrogram delivered to autonomous agent logic."
      },
      {
        id: "c8",
        from: "preprocessing",
        to: "telemetry",
        label: "packet",
        style: "dashed",
        color: "#a855f7",
        protocol: "Async Pub/Sub",
        description: "Signal quality metrics forwarded to telemetry channel."
      },

      // Multi-Agent Connections
      {
        id: "c9",
        from: "auv_agents",
        to: "nav_agent",
        label: "nav",
        style: "solid",
        color: "#64748b",
        protocol: "Agent Protocol",
        description: "Vehicle coordinates and terrain maps forwarded for waypoint optimization."
      },
      {
        id: "c10",
        from: "auv_agents",
        to: "risk_agent",
        label: "risk",
        style: "solid",
        color: "#64748b",
        protocol: "Agent Protocol",
        description: "Telemetry and target proximity data submitted for risk scoring."
      },
      {
        id: "c11",
        from: "risk_agent",
        to: "briefing_agent",
        label: "brief",
        style: "solid",
        color: "#64748b",
        protocol: "Agent Protocol",
        description: "Threat scores synthesized into tactical mission briefing updates."
      },
      {
        id: "c12",
        from: "auv_agents",
        to: "streamlit_dash",
        label: "directives",
        style: "dashed",
        color: "#a855f7",
        protocol: "WebSocket",
        description: "Autonomous planning recommendations visualized on operator console."
      },

      // Inference Pipeline
      {
        id: "c13",
        from: "auv_agents",
        to: "inference_engine",
        label: "run inference",
        style: "solid",
        color: "#10b981",
        protocol: "PyTorch C++ Binding",
        description: "Triggers anomaly scoring pipeline on current acoustic observation."
      },
      {
        id: "c14",
        from: "inference_engine",
        to: "auv_agents",
        label: "anomaly",
        style: "solid",
        color: "#38bdf8",
        protocol: "Direct Call",
        description: "Anomaly score and confidence threshold returned to vehicle planner."
      },
      {
        id: "c15",
        from: "conv_autoencoder",
        to: "inference_engine",
        label: "MSE",
        style: "solid",
        color: "#10b981",
        protocol: "Torch Tensor",
        description: "Mean Squared Error reconstruction residual calculated against baseline weights."
      },
      {
        id: "c16",
        from: "inference_engine",
        to: "feature_extractor",
        label: "Stage 2",
        style: "solid",
        color: "#64748b",
        protocol: "NumPy Array",
        description: "High-confidence anomaly regions submitted for deep feature extraction."
      },

      // Sensing & Navigation Links
      {
        id: "c17",
        from: "inference_engine",
        to: "confidence",
        label: "score",
        style: "solid",
        color: "#64748b",
        protocol: "Numeric Scalar",
        description: "Raw anomaly magnitude piped into multi-factor Bayesian confidence model."
      },
      {
        id: "c18",
        from: "confidence",
        to: "geotagging",
        label: "geotag",
        style: "solid",
        color: "#64748b",
        protocol: "JSON Event",
        description: "Confirmed anomaly tag associated with current spatial latitude/longitude."
      },
      {
        id: "c19",
        from: "geotagging",
        to: "space_surv",
        label: "SAR/AIS",
        style: "solid",
        color: "#64748b",
        protocol: "REST API",
        description: "Subsea contacts cross-referenced against satellite surface vessel tracks."
      },
      {
        id: "c20",
        from: "inference_engine",
        to: "vehicle_dynamics",
        label: "control",
        style: "dashed",
        color: "#a855f7",
        protocol: "CAN Bus Msg",
        description: "Adjusts cruising speed and dive angle during contact tracking."
      },
      {
        id: "c21",
        from: "feature_extractor",
        to: "acoustic_physics",
        label: "positioning",
        style: "solid",
        color: "#64748b",
        protocol: "Ray Matrix",
        description: "Acoustic arrival angles combined with thermocline sound velocity profile."
      },
      {
        id: "c22",
        from: "subsea_nav",
        to: "acoustic_physics",
        label: "SLAM drift",
        style: "solid",
        color: "#64748b",
        protocol: "Kalman Filter State",
        description: "Dead reckoning drift correction integrated with seafloor acoustic landmarks."
      },

      // Data & Analytics Connections
      {
        id: "c23",
        from: "inference_engine",
        to: "event_logger",
        label: "event",
        style: "solid",
        color: "#64748b",
        protocol: "Async Disk Flush",
        description: "Anomaly event record with timestamps and bounding features written to disk."
      },
      {
        id: "c24",
        from: "event_logger",
        to: "heatmap",
        label: "geo-events",
        style: "dashed",
        color: "#a855f7",
        protocol: "Broadcast Stream",
        description: "Geo-tagged detections stream into live bathymetric heat map."
      },
      {
        id: "c25",
        from: "event_logger",
        to: "temporal_ai",
        label: "CSV",
        style: "dashed",
        color: "#64748b",
        protocol: "File Stream",
        description: "Historical events ingested for periodic long-term pattern classification."
      },
      {
        id: "c26",
        from: "temporal_ai",
        to: "accumulation",
        label: "trends",
        style: "solid",
        color: "#64748b",
        protocol: "IPC Shm",
        description: "Long-term ambient acoustic trend shifts sent to statistical aggregator."
      },
      {
        id: "c27",
        from: "telemetry",
        to: "data_store",
        label: "persist",
        style: "dashed",
        color: "#a855f7",
        protocol: "Parquet Store",
        description: "Continuous vehicle engineering telemetry saved to on-board storage."
      },
      {
        id: "c28",
        from: "data_store",
        to: "training_pipeline",
        label: "reads",
        style: "solid",
        color: "#64748b",
        protocol: "PyTorch DataLoader",
        description: "Annotated acoustic samples read during offline retraining jobs."
      },
      {
        id: "c29",
        from: "training_pipeline",
        to: "conv_autoencoder",
        label: "weights",
        style: "dashed",
        color: "#a855f7",
        protocol: "Model Checkpoint",
        description: "Updated model weight tensors pushed to inference registry."
      }
    ],
    layerStats: {
      frontend: 2,
      backend: 19,
      database: 3,
      security: 1,
      external: 2
    },
    adrs: [
      {
        id: "ADR-001",
        title: "Dual-Stage AI Anomaly Detection with ConvAutoencoder",
        status: "Accepted",
        layer: "Backend / Database",
        date: "2026-10-20",
        decision: "Use a local 1D/2D Convolutional Autoencoder for primary unsupervised anomaly filtering (Stage 1), routing candidate clips to deep feature extractors (Stage 2) only when reconstruction error exceeds the dynamic SNR threshold.",
        consequences: "Eliminates 93% of false alarms from ambient sea biological noise while maintaining strict sub-15ms inference latency on edge hardware."
      },
      {
        id: "ADR-002",
        title: "Air-Gapped Defense Boundary with HMAC Cryptographic Verification",
        status: "Accepted",
        layer: "Security",
        date: "2026-10-22",
        decision: "Isolate tactical telemetry and override channels behind a dedicated, air-gapped security boundary with hardware token HMAC validation before granting command execution.",
        consequences: "Prevents spoofing and unauthorized acoustic command injections over wireless or hydro-acoustic modems."
      },
      {
        id: "ADR-003",
        title: "Asynchronous ZeroMQ Sonar Bus & Ingest Queue",
        status: "Accepted",
        layer: "Backend",
        date: "2026-10-24",
        decision: "Decouple real-time hydrophone hardware drivers from HTTP/WebSocket consumers via an in-memory lock-free ZeroMQ ring buffer.",
        consequences: "Guarantees zero dropped acoustic frames during burst transmission or CPU load spikes."
      }
    ],
    rules: [
      {
        id: "RULE-SEC-01",
        severity: "error",
        description: "External operators cannot bypass the Security Layer to invoke the FastAPI REST API directly.",
        source: "auv_operator",
        target: "fastapi_api",
        allowed: false
      },
      {
        id: "RULE-DATA-02",
        severity: "warning",
        description: "Inference Engine must write events via Event Logger and never write directly to raw Data Store.",
        source: "inference_engine",
        target: "data_store",
        allowed: false
      },
      {
        id: "RULE-AIRGAP-03",
        severity: "error",
        description: "Secret/NOFORN air-gapped boundary components cannot open unencrypted outgoing sockets.",
        source: "security_layer",
        target: "external",
        allowed: false
      }
    ]
  },

  openlens_core: {
    id: "openlens_core",
    name: "OpenLens Core System - VS Code & Snowflake Integration",
    description: "Production architecture connecting VS Code OpenLens Dev AST analysis with OpenLens Archy Web Workspace and Snowflake Knowledge Store.",
    boundaries: [
      {
        id: "client_ide",
        label: "Client Workspaces (VS Code & Browser)",
        x: 40,
        y: 40,
        width: 300,
        height: 600,
        color: "rgba(56, 189, 248, 0.8)",
        fill: "rgba(56, 189, 248, 0.03)",
        borderStyle: "dashed"
      },
      {
        id: "backend_core",
        label: "OpenLens Reasoning & Gateway Engine",
        x: 400,
        y: 40,
        width: 360,
        height: 600,
        color: "rgba(16, 185, 129, 0.8)",
        fill: "rgba(16, 185, 129, 0.03)",
        borderStyle: "dashed"
      },
      {
        id: "snowflake_cloud",
        label: "Snowflake Knowledge & Model Lake",
        x: 820,
        y: 40,
        width: 320,
        height: 600,
        color: "rgba(168, 85, 247, 0.8)",
        fill: "rgba(168, 85, 247, 0.03)",
        borderStyle: "dashed"
      }
    ],
    nodes: [
      {
        id: "vscode_ext",
        label: "VS Code Extension",
        file: "extension.ts",
        layer: "frontend",
        icon: "layout",
        x: 80,
        y: 90,
        width: 180,
        height: 70,
        details: "Developer-facing VS Code extension hosting commands, status bar indicators, and code actions."
      },
      {
        id: "openlens_dev",
        label: "OpenLens Dev",
        file: "Local AST & Linters",
        layer: "backend",
        icon: "code",
        x: 80,
        y: 220,
        width: 180,
        height: 70,
        details: "High-performance Python AST parser, duplication detector, and local lint checker running offline."
      },
      {
        id: "archy_web",
        label: "OpenLens Archy",
        file: "Web Workspace",
        layer: "frontend",
        icon: "layout",
        x: 80,
        y: 360,
        width: 180,
        height: 70,
        details: "Interactive visual system design studio with live flow pathing, ADRs, and boundary validation."
      },
      {
        id: "shared_api",
        label: "Shared Backend API",
        file: "FastAPI / Pydantic",
        layer: "backend",
        icon: "code",
        x: 460,
        y: 150,
        width: 200,
        height: 75,
        details: "Unified REST & WebSocket gateway coordinating analysis payloads with strict privacy scrubbing."
      },
      {
        id: "retrieval_svc",
        label: "Retrieval Service",
        file: "Hybrid Semantic Search",
        layer: "backend",
        icon: "code",
        x: 460,
        y: 290,
        width: 200,
        height: 75,
        details: "Indexes verified architecture patterns, design decisions, and curated refactoring benchmarks."
      },
      {
        id: "model_gateway",
        label: "Model Gateway",
        file: "Open-Source LLMs",
        layer: "backend",
        icon: "code",
        x: 460,
        y: 430,
        width: 200,
        height: 75,
        details: "Provider-neutral gateway with secret redaction routing prompts to local or remote open-weights."
      },
      {
        id: "snowflake_store",
        label: "Snowflake Knowledge Base",
        file: "Cortex AI & Tables",
        layer: "database",
        icon: "database",
        x: 860,
        y: 180,
        width: 220,
        height: 80,
        details: "Curated architectural knowledge graph and versioned evaluation benchmarks on Snowflake."
      },
      {
        id: "arch_rules",
        label: "Architecture Rules",
        file: "rules.json & ADRs",
        layer: "security",
        icon: "shield",
        x: 860,
        y: 360,
        width: 220,
        height: 80,
        details: "Machine-verifiable constraints exported by Archy and strictly enforced by OpenLens Dev inside VS Code."
      }
    ],
    connections: [
      {
        id: "cc1",
        from: "vscode_ext",
        to: "openlens_dev",
        label: "activates",
        style: "solid",
        color: "#38bdf8",
        protocol: "VS Code API",
        description: "Monitors active editor tabs and triggers debounced AST scans."
      },
      {
        id: "cc2",
        from: "vscode_ext",
        to: "archy_web",
        label: "launches",
        style: "solid",
        color: "#38bdf8",
        protocol: "Webview / Browser",
        description: "Launches the Archy web design workspace with active repository metadata."
      },
      {
        id: "cc3",
        from: "openlens_dev",
        to: "shared_api",
        label: "scanned ast",
        style: "solid",
        color: "#10b981",
        protocol: "REST (Redacted)",
        description: "Sends sanitized symbol graphs to backend for pattern matching."
      },
      {
        id: "cc4",
        from: "archy_web",
        to: "shared_api",
        label: "diagram & adr",
        style: "solid",
        color: "#10b981",
        protocol: "REST / JSON",
        description: "Synchronizes diagram definitions and trade-off proposals."
      },
      {
        id: "cc5",
        from: "shared_api",
        to: "retrieval_svc",
        label: "query patterns",
        style: "solid",
        color: "#64748b",
        protocol: "Internal Call",
        description: "Queries vetted architectural conventions based on project requirements."
      },
      {
        id: "cc6",
        from: "shared_api",
        to: "model_gateway",
        label: "inference",
        style: "solid",
        color: "#64748b",
        protocol: "HTTP/2",
        description: "Submits prompts with bounded context for trade-off analysis."
      },
      {
        id: "cc7",
        from: "retrieval_svc",
        to: "snowflake_store",
        label: "vector search",
        style: "dashed",
        color: "#a855f7",
        protocol: "Snowflake Cortex",
        description: "Vector embedding retrieval against curated Snowflake architectural benchmarks."
      },
      {
        id: "cc8",
        from: "archy_web",
        to: "arch_rules",
        label: "exports rules",
        style: "dashed",
        color: "#ef4444",
        protocol: "JSON Spec",
        description: "Archy formalizes boundary rules and exports them for active project enforcement."
      },
      {
        id: "cc9",
        from: "arch_rules",
        to: "openlens_dev",
        label: "enforces constraints",
        style: "dashed",
        color: "#ef4444",
        protocol: "AST Validation",
        description: "Dev flags unauthorized cross-boundary imports immediately in the VS Code editor."
      }
    ],
    layerStats: {
      frontend: 2,
      backend: 4,
      database: 1,
      security: 1,
      external: 0
    },
    adrs: [
      {
        id: "ADR-CORE-001",
        title: "Two-Mode Architecture: Dev in VS Code, Archy in Web Workspace",
        status: "Accepted",
        layer: "Frontend / System",
        date: "2026-10-18",
        decision: "Provide code-level maintainability in the VS Code extension and system-level visual design in the Archy web workspace, connected by shared rules and API.",
        consequences: "Prevents IDE bloat while giving developers dedicated visual workspace for complex diagrams and trade-off evaluations."
      },
      {
        id: "ADR-CORE-002",
        title: "Deterministic Local AST Analysis with Fail-Safe Offline Mode",
        status: "Accepted",
        layer: "Backend",
        date: "2026-10-19",
        decision: "Perform all core duplication and linter checks locally via Python AST without requiring cloud availability or Snowflake access.",
        consequences: "Ensures immediate editor feedback (<50ms) and complete user privacy for proprietary codebases."
      }
    ],
    rules: [
      {
        id: "RULE-CORE-01",
        severity: "error",
        description: "Local Dev checks must never transmit raw source code or credentials to external APIs without explicit consent.",
        source: "openlens_dev",
        target: "model_gateway",
        allowed: false
      }
    ]
  }
};
