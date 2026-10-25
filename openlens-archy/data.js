// OpenLens Archy - Architecture Dataset & Presets
// Implements complete schemas for Architecture Canvas, Tech Stack, System Design, and Design Patterns

export const ARCHITECTURE_PRESETS = {
  auv_defense: {
    id: "auv_defense",
    name: "AUV Autonomous Defense - Dual-Stage AI Pipeline",
    description: "Multi-agent subsea exploration and acoustic anomaly detection architecture with air-gapped security boundaries.",
    
    // Tech Stack detected from user files
    techStack: [
      {
        id: "ts_streamlit",
        name: "Streamlit",
        category: "Frontend UI",
        version: "1.32.0",
        file: "dashboard.py",
        icon: "🖥️",
        status: "Detected in Repo",
        rationale: "Rapid interactive mission telemetry and 3D subsea anomaly visualization interface with zero build pipeline.",
        pros: ["Reactive state binding", "Native PyDeck/Plotly 3D charts", "Fast operator dashboard prototyping"],
        cons: ["Session state sync overhead under rapid multi-tab streams"]
      },
      {
        id: "ts_fastapi",
        name: "FastAPI",
        category: "Backend REST API",
        version: "0.110.0",
        file: "api.py",
        icon: "⚡",
        status: "Detected in Repo",
        rationale: "High-performance async ASGI REST API handling hydrophone telemetry ingestion and directive dispatch.",
        pros: ["Native Python type hints", "Sub-millisecond Pydantic validation", "Automatic OpenAPI docs"],
        cons: ["Requires Uvicorn ASGI event loop tuning for ultra-high concurrency"]
      },
      {
        id: "ts_pytorch",
        name: "PyTorch & TorchScript",
        category: "AI / Inference Engine",
        version: "2.2.1+cu121",
        file: "model.py, infer.py",
        icon: "🔥",
        status: "Detected in Repo",
        rationale: "Powers 1D/2D Convolutional Autoencoder for unsupervised acoustic anomaly reconstruction and C++ JIT execution.",
        pros: ["TorchScript C++ edge runtime", "CUDA accelerated tensor math", "Dynamic compute graph"],
        cons: ["Higher container footprint on edge subsea compute hardware"]
      },
      {
        id: "ts_zeromq",
        name: "ZeroMQ (pyzmq)",
        category: "Ingestion & Message Bus",
        version: "25.1.2",
        file: "sonar_bus.py",
        icon: "📡",
        status: "Detected in Repo",
        rationale: "Zero-copy lock-free shared memory pub/sub ring buffer streaming acoustic waveforms directly from hydrophone hardware.",
        pros: ["Sub-50 microsecond latency", "Zero broker daemon dependency", "Ultra-low memory overhead"],
        cons: ["No out-of-the-box persistent message retention"]
      },
      {
        id: "ts_scipy",
        name: "NumPy & SciPy Signal",
        category: "Digital Signal Processing",
        version: "1.26.4",
        file: "preprocessing.py, features.py",
        icon: "🌊",
        status: "Detected in Repo",
        rationale: "Real-time acoustic FFT transforms, sound velocity ray-tracing, bandpass filtering, and mel-spectrogram extraction.",
        pros: ["SIMD vectorized array ops", "Established digital filter algorithms", "Predictable deterministic latency"],
        cons: ["CPU intensive when processing multi-beam 64-channel hydrophone arrays"]
      },
      {
        id: "ts_crypto",
        name: "PyCryptodome / HMAC",
        category: "Security & Cryptography",
        version: "3.20.0",
        file: "security.py",
        icon: "🛡️",
        status: "Detected in Repo",
        rationale: "Hardware token HMAC-SHA256 request verification, secret rotation, and air-gapped zero-trust boundary verification.",
        pros: ["Constant-time crypto comparison", "FIPS compliant primitives", "Tamper-proof signature verification"],
        cons: ["Requires hardware clock synchronization across acoustic transponders"]
      },
      {
        id: "ts_parquet",
        name: "Apache Parquet / PyArrow",
        category: "Data Store & Telemetry",
        version: "15.0.1",
        file: "telemetry.py, data_store.py",
        icon: "💾",
        status: "Detected in Repo",
        rationale: "Columnar compressed telemetry persistence saving on-board SSD wear during 48-hour continuous subsea missions.",
        pros: ["80% compression ratio vs raw CSV", "Fast vector analytics query speed", "Schema evolution support"],
        cons: ["Write amplification during frequent small row appends (mitigated by write buffering)"]
      },
      {
        id: "ts_pydeck",
        name: "PyDeck (Deck.gl)",
        category: "Geospatial Visualization",
        version: "0.8.0",
        file: "heatmap.py",
        icon: "🗺️",
        status: "Detected in Repo",
        rationale: "GPU-accelerated bathymetric geospatial heatmaps rendering subsea terrain anomalies and vehicle dead reckoning tracks.",
        pros: ["WebGL 60FPS rendering of 500k+ data points", "Hexagon / Heatmap layer blending"],
        cons: ["Requires WebGL enabled browser environment"]
      }
    ],

    // System Design Specifications for user files
    systemDesign: {
      architectureStyle: "Hybrid Event-Driven Pipeline & Air-Gapped Microservices",
      deploymentTarget: "Edge Autonomous Underwater Vehicle (NVIDIA Jetson AGX Orin + Intel Xeon Embedded)",
      primaryGoals: [
        "Sub-15ms acoustic anomaly inference latency",
        "Air-gapped SECRET//NOFORN isolation without internet reliance",
        "Zero dropped hydrophone frame buffers under burst sonar conditions",
        "Autonomous dead-reckoning navigation with SLAM acoustic drift correction"
      ],
      specifications: [
        {
          title: "1. Ingestion & Bus Topology",
          icon: "⚡",
          summary: "Decoupled hardware transducer streaming via ZeroMQ ring buffer.",
          details: "Transducer raw waveforms are read via direct memory access (DMA) into `sonar_bus.py`, buffered in an in-memory lock-free queue with capacity for 50,000 frames. Prevents backpressure on hydrophone sensors while FastAPI workers consume frames concurrently."
        },
        {
          title: "2. Dual-Stage Anomaly Detection Pipeline",
          icon: "🧠",
          summary: "Two-tier hierarchical inference optimizing compute and precision.",
          details: "Stage 1: A lightweight ConvAutoencoder (`model.py`) evaluates reconstruction error (MSE) across FFT spectrograms in under 6ms. If MSE exceeds dynamic baseline threshold, Stage 2 (`infer.py` + `features.py`) activates deep harmonic and spatial correlation algorithms."
        },
        {
          title: "3. Air-Gapped Zero-Trust Security Boundary",
          icon: "🔒",
          summary: "Cryptographic validation separating external uplinks from tactical systems.",
          details: "The `security.py` layer isolates tactical mission execution behind SECRET//NOFORN boundaries. All operator commands from `dashboard.py` must present valid HMAC-SHA256 signatures before `api.py` or `agents.py` execute maneuvers."
        },
        {
          title: "4. Multi-Agent Advisory System",
          icon: "🤖",
          summary: "Distributed autonomous agents collaborating on pathing and threat mitigation.",
          details: "Consists of Nav Agent (waypoint calculations across P1/P2/P3 safety tiers), Risk Agent (real-time environmental and sonar threat evaluation), and Briefing Agent (tactical summary generation for surfacing uplinks)."
        },
        {
          title: "5. Data Persistence & Analytics Lifecycle",
          icon: "📊",
          summary: "Dual-tier local persistence separating mission audit logs from raw telemetry.",
          details: "Real-time anomalies are appended synchronously to tamper-evident CSV audit logs (`logger.py`), while raw 100Hz sensor telemetry is accumulated in memory and flushed in compressed Parquet chunks (`data_store.py`) to preserve SSD life."
        }
      ],
      slaMetrics: [
        { label: "Anomaly Inference Latency", value: "< 15 ms", status: "Optimal" },
        { label: "ZeroMQ Bus Dispatch Latency", value: "< 50 µs", status: "Optimal" },
        { label: "Acoustic Frame Ingest Throughput", value: "10,000 frames/sec", status: "Sustained" },
        { label: "Air-Gapped Network Egress", value: "0 bytes (Strict)", status: "Enforced" },
        { label: "Subsea Autonomous Mission Duration", value: "Up to 72 hours", status: "Validated" }
      ]
    },

    // Design Patterns identified in user files
    designPatterns: [
      {
        id: "dp_strategy",
        name: "Strategy Pattern",
        category: "Behavioral",
        file: "infer.py",
        icon: "🔀",
        description: "Enables dynamic switching between Stage 1 Unsupervised Autoencoder and Stage 2 Deep Feature Extractor based on signal-to-noise ratio (SNR).",
        implementationSnippet: `class AnomalyInferenceStrategy(ABC):
    @abstractmethod
    def evaluate(self, spectrogram: np.ndarray) -> AnomalyResult:
        pass

class AutoencoderStage1(AnomalyInferenceStrategy):
    def evaluate(self, spectrogram: np.ndarray) -> AnomalyResult:
        reconstructed = self.model(spectrogram)
        mse = torch.mean((spectrogram - reconstructed) ** 2)
        return AnomalyResult(score=mse.item(), is_anomaly=mse > self.threshold)

class HarmonicFeatureStage2(AnomalyInferenceStrategy): ...`,
        rationale: "Allows hot-swapping acoustic inference models without modifying pipeline orchestration logic.",
        maintainabilityImpact: "+42% testability and zero downtime model upgrades."
      },
      {
        id: "dp_pubsub",
        name: "Publisher-Subscriber (Pub/Sub)",
        category: "Architectural",
        file: "sonar_bus.py",
        icon: "📡",
        description: "Decouples raw sonar frame capture from downstream consumers (Preprocessing, Telemetry, and Training Pipeline).",
        implementationSnippet: `class SonarBusPublisher:
    def __init__(self, endpoint="ipc:///tmp/sonar_frames.ipc"):
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.bind(endpoint)

    def publish_frame(self, frame_packet: SonarFrame):
        self.socket.send_multipart([b"sonar.raw", frame_packet.serialize()])`,
        rationale: "Prevents slow signal processing steps from blocking real-time transducer hardware DMA buffers.",
        maintainabilityImpact: "Eliminates tight coupling between hardware I/O and analytics."
      },
      {
        id: "dp_pipeline_filter",
        name: "Pipeline & Filter Pattern",
        category: "Architectural",
        file: "preprocessing.py",
        icon: "⛓️",
        description: "Executes sequential audio signal transforms: Raw Waveform ➔ Normalization ➔ Noise Gate ➔ 2D FFT Spectrogram.",
        implementationSnippet: `class SignalPipeline:
    def __init__(self, filters: List[SignalFilter]):
        self.filters = filters

    def process(self, raw_audio: np.ndarray) -> np.ndarray:
        data = raw_audio
        for stage in self.filters:
            data = stage.apply(data)
        return data`,
        rationale: "Individual signal filters can be benchmarked, unit-tested, or replaced in isolation.",
        maintainabilityImpact: "Clean separation of mathematical signal transformation stages."
      },
      {
        id: "dp_factory",
        name: "Factory Method Pattern",
        category: "Creational",
        file: "agents.py",
        icon: "🏭",
        description: "Instantiates specialized autonomous sub-agents (NavAgent, RiskAgent, BriefingAgent) based on active vehicle operational modes.",
        implementationSnippet: `class AgentFactory:
    @staticmethod
    def create_advisory_agent(agent_type: str, config: MissionConfig) -> BaseAgent:
        if agent_type == "nav":
            return NavAgent(waypoints=config.waypoints, safety_tier=config.tier)
        elif agent_type == "risk":
            return RiskAgent(thresholds=config.risk_limits)
        elif agent_type == "briefing":
            return BriefingAgent(uplink_protocol=config.uplink)
        raise ValueError(f"Unknown agent type: {agent_type}")`,
        rationale: "Centralizes agent instantiation logic and isolates configuration dependencies.",
        maintainabilityImpact: "Enables adding new agent variants without touching coordinator code."
      },
      {
        id: "dp_decorator_middleware",
        name: "Decorator / Security Middleware",
        category: "Structural",
        file: "security.py",
        icon: "🛡️",
        description: "Wraps sensitive mission API endpoints with HMAC cryptographic verification and air-gap boundary assertion.",
        implementationSnippet: `def require_airgap_authorization(allowed_roles: List[str]):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            verify_hmac_signature(request.headers.get("X-HMAC-Token"))
            assert_airgap_compliance(request.client.host)
            return await func(*args, **kwargs)
        return wrapper
    return decorator`,
        rationale: "Guarantees zero-trust boundary verification on all mutating endpoints without duplicate validation code.",
        maintainabilityImpact: "Ensures no endpoint accidentally bypasses security controls."
      },
      {
        id: "dp_repository",
        name: "Repository Pattern",
        category: "Structural",
        file: "data_store.py",
        icon: "🗄️",
        description: "Abstracts telemetry and model checkpoint persistence between in-memory buffer, Parquet files, and SQLite catalog.",
        implementationSnippet: `class TelemetryRepository:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path

    def save_batch(self, telemetry_batch: List[TelemetryRecord]) -> None:
        table = pa.Table.from_pylist([r.to_dict() for r in telemetry_batch])
        pq.write_to_dataset(table, root_path=self.storage_path)

    def query_time_range(self, start_ts: float, end_ts: float) -> pd.DataFrame: ...`,
        rationale: "Decouples data consumption from low-level file I/O and compression mechanisms.",
        maintainabilityImpact: "Facilitates seamless mocking during offline unit tests."
      }
    ],

    // User Files Mapping
    userFiles: [
      { path: "dashboard.py", layer: "frontend", component: "Streamlit Dashboard", lines: 340, tech: "Streamlit, PyDeck", pattern: "MVC / Presenter" },
      { path: "api.py", layer: "backend", component: "FastAPI REST API", lines: 480, tech: "FastAPI, Pydantic", pattern: "Facade / Controller" },
      { path: "security.py", layer: "security", component: "Security Layer", lines: 290, tech: "PyCryptodome, HMAC", pattern: "Decorator / Middleware" },
      { path: "agents.py", layer: "backend", component: "AUV Agents", lines: 520, tech: "Python AsyncIO", pattern: "Factory Method / Mediator" },
      { path: "nav_agent.py", layer: "backend", component: "Nav Agent", lines: 310, tech: "SciPy Optimize", pattern: "State / Strategy" },
      { path: "risk_agent.py", layer: "backend", component: "Risk Agent", lines: 260, tech: "Bayesian Network", pattern: "Observer" },
      { path: "briefing_agent.py", layer: "backend", component: "Briefing Agent", lines: 220, tech: "Text Template Engine", pattern: "Builder" },
      { path: "preprocessing.py", layer: "backend", component: "Preprocessing", lines: 410, tech: "NumPy, SciPy Signal", pattern: "Pipeline & Filter" },
      { path: "sonar_bus.py", layer: "backend", component: "Sonar Bus", lines: 360, tech: "ZeroMQ (pyzmq)", pattern: "Publisher-Subscriber" },
      { path: "telemetry.py", layer: "backend", component: "Telemetry", lines: 280, tech: "PyArrow, Parquet", pattern: "Observer / Collector" },
      { path: "model.py", layer: "database", component: "ConvAutoencoder", lines: 390, tech: "PyTorch 1D/2D CNN", pattern: "Model Weights / Artifact" },
      { path: "infer.py", layer: "backend", component: "Inference Engine", lines: 540, tech: "TorchScript, NumPy", pattern: "Strategy Pattern" },
      { path: "features.py", layer: "backend", component: "Feature Extractor", lines: 330, tech: "Librosa / SciPy", pattern: "Filter / Extractor" },
      { path: "geotagging.py", layer: "backend", component: "Geotagging", lines: 210, tech: "PyProj, Geodesic", pattern: "Adapter Pattern" },
      { path: "space_surveillance.py", layer: "backend", component: "Space Surv.", lines: 290, tech: "SAR/AIS Client", pattern: "Gateway / Client" },
      { path: "confidence.py", layer: "backend", component: "Confidence", lines: 190, tech: "Bayesian Estimator", pattern: "Composite" },
      { path: "vehicle_dynamics.py", layer: "backend", component: "Vehicle Dynamics", lines: 380, tech: "6-DOF Kinematics", pattern: "State Machine" },
      { path: "acoustic_physics.py", layer: "backend", component: "Acoustic Physics", lines: 440, tech: "SVP Ray-Tracer", pattern: "Strategy" },
      { path: "subsea_navigation.py", layer: "backend", component: "Subsea Nav", lines: 470, tech: "DVL SLAM Filter", pattern: "Observer / Filter" },
      { path: "logger.py", layer: "database", component: "Event Logger", lines: 250, tech: "CSV / SQLite WAL", pattern: "Singleton / Logger" },
      { path: "heatmap.py", layer: "frontend", component: "Heatmap", lines: 310, tech: "Deck.gl, PyDeck", pattern: "View Renderer" },
      { path: "temporal_ai.py", layer: "backend", component: "Temporal AI", lines: 430, tech: "PyTorch LSTM", pattern: "Strategy" },
      { path: "accumulation.py", layer: "backend", component: "Accumulation", lines: 270, tech: "Pandas Rolling", pattern: "Aggregator" },
      { path: "data_store.py", layer: "database", component: "Data Store", lines: 320, tech: "Parquet Dataset", pattern: "Repository Pattern" },
      { path: "train.py", layer: "backend", component: "Training Pipeline", lines: 490, tech: "PyTorch Lightning", pattern: "Template Method" }
    ],

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
      {
        id: "nav_agent",
        label: "Nav Agent",
        file: "nav_agent.py · P1/P2/P3",
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
        file: "risk_agent.py · Env risk",
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
        file: "briefing_agent.py · Mission",
        layer: "backend",
        icon: "code",
        x: 670,
        y: 60,
        width: 120,
        height: 60,
        details: "Generates situational briefing summaries for tactical logging and command uplink."
      },
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
        file: "data_store.py · models/",
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
    techStack: [
      {
        id: "ts_vscode",
        name: "VS Code Extension API",
        category: "Client Host",
        version: "^1.88.0",
        file: "src/extension.ts",
        icon: "💻",
        status: "Active Plugin",
        rationale: "Host environment for OpenLens Dev editor diagnostics, quick-fixes, and status indicators.",
        pros: ["Standard developer workflow", "Zero context switching", "Rich diagnostics API"],
        cons: ["Constrained webview sandbox communication"]
      },
      {
        id: "ts_python_ast",
        name: "Python AST & LibCST",
        category: "Static Analysis Engine",
        version: "3.11+",
        file: "engine/ast_scanner.py",
        icon: "🐍",
        status: "Local Offline",
        rationale: "Deterministic local code parsing, exact duplicate subtree matching, and unused symbol linting.",
        pros: ["100% deterministic", "Zero external network dependency", "Privacy-preserving local scanning"],
        cons: ["Requires AST tree normalization across Python minor versions"]
      },
      {
        id: "ts_snowflake",
        name: "Snowflake Cortex & Snowpark",
        category: "Knowledge & Benchmark Lake",
        version: "Enterprise",
        file: "services/snowflake_bridge.py",
        icon: "❄️",
        status: "Connected",
        rationale: "Stores curated architectural patterns, versioned benchmark evaluation sets, and semantic embeddings.",
        pros: ["Enterprise governance", "Scalable vector similarity search", "Isolated multi-tenant benchmarks"],
        cons: ["Requires network connectivity and authenticated session token"]
      },
      {
        id: "ts_fastapi_core",
        name: "FastAPI Shared Gateway",
        category: "Reasoning Gateway",
        version: "0.110.0",
        file: "api/gateway.py",
        icon: "⚡",
        status: "Shared API",
        rationale: "Coordinates sanitized payload routing between Dev, Archy, and model adapters with secret redaction.",
        pros: ["Asynchronous worker pools", "OpenAPI schema synchronization"],
        cons: ["Requires secret redaction filter verification before remote hops"]
      }
    ],
    systemDesign: {
      architectureStyle: "Two-Tier Hybrid Client-Cloud (VS Code Dev + Archy Web Studio + Snowflake)",
      deploymentTarget: "Local Developer Machine + Snowflake Cloud Cortex",
      primaryGoals: [
        "Instant (<50ms) local deterministic code checks offline",
        "Visual architecture modeling and ADR authoring in web workspace",
        "Snowflake-backed architectural pattern retrieval without leaking source code",
        "Bidirectional constraint exchange between Archy rules and Dev AST linter"
      ],
      specifications: [
        {
          title: "1. Local-First Deterministic Analysis",
          icon: "🔒",
          summary: "Local AST engine runs fully offline inside VS Code.",
          details: "The AST scanner performs duplicate subtree hash matching, unused import detection, and complexity scoring completely offline without transmitting files."
        },
        {
          title: "2. Archy Architecture Rules Engine",
          icon: "📐",
          summary: "Visual design studio compiling rules into machine-verifiable AST constraints.",
          details: "System design decisions and boundary definitions created in Archy compile into a standardized `rules.json` that the VS Code extension loads to detect illegal imports in real time."
        },
        {
          title: "3. Snowflake Knowledge & Benchmark Integration",
          icon: "❄️",
          summary: "Curated architectural patterns and reproducible evaluation benchmarks.",
          details: "Snowflake hosts vetted architectural ADRs, library migration benchmarks, and evaluation datasets, retrieved via bounded context queries."
        }
      ],
      slaMetrics: [
        { label: "Local AST Scan Latency", value: "< 45 ms", status: "Optimal" },
        { label: "Rule Conformance Check", value: "< 20 ms", status: "Optimal" },
        { label: "Remote Snowflake Retrieval", value: "~180 ms", status: "Cached" }
      ]
    },
    designPatterns: [
      {
        id: "dp_adapter",
        name: "Adapter Pattern",
        category: "Structural",
        file: "services/model_adapter.py",
        icon: "🔌",
        description: "Provider-neutral inference adapter allowing dynamic swapping between local LLMs (Ollama/vLLM) and remote gateways.",
        implementationSnippet: `class ModelGatewayAdapter(ABC):
    @abstractmethod
    async def complete(self, prompt: BoundedPrompt) -> ModelProposal:
        pass`,
        rationale: "Guarantees vendor neutrality and local privacy fallback.",
        maintainabilityImpact: "Shields application code from model provider API drift."
      },
      {
        id: "dp_rule_engine",
        name: "Interpreter / Specification Pattern",
        category: "Behavioral",
        file: "engine/rule_evaluator.py",
        icon: "⚖️",
        description: "Evaluates modular architecture boundary constraints against active import dependency graphs.",
        implementationSnippet: `class BoundarySpecification:
    def is_satisfied_by(self, import_node: ASTImport) -> bool:
        return not (import_node.source_layer == "external" and import_node.target_layer == "security")`,
        rationale: "Allows combining and chaining architectural rules dynamically without code redeployment.",
        maintainabilityImpact: "Reusable across both VS Code Dev and Archy Web."
      }
    ],
    userFiles: [
      { path: "src/extension.ts", layer: "frontend", component: "VS Code Extension", lines: 450, tech: "TypeScript, VS Code API", pattern: "Facade / Controller" },
      { path: "engine/ast_scanner.py", layer: "backend", component: "OpenLens Dev", lines: 580, tech: "Python AST, LibCST", pattern: "Visitor Pattern" },
      { path: "openlens-archy/index.html", layer: "frontend", component: "OpenLens Archy", lines: 320, tech: "Vanilla JS, CSS Grid", pattern: "MVC" },
      { path: "api/gateway.py", layer: "backend", component: "Shared Backend API", lines: 390, tech: "FastAPI, Pydantic", pattern: "Gateway / Facade" },
      { path: "services/retrieval.py", layer: "backend", component: "Retrieval Service", lines: 340, tech: "Vector Search", pattern: "Strategy Pattern" },
      { path: "services/model_adapter.py", layer: "backend", component: "Model Gateway", lines: 280, tech: "AsyncIO, HTTPX", pattern: "Adapter Pattern" },
      { path: "services/snowflake_bridge.py", layer: "database", component: "Snowflake Knowledge Base", lines: 310, tech: "Snowflake Cortex", pattern: "Repository Pattern" },
      { path: "rules/architecture_rules.json", layer: "security", component: "Architecture Rules", lines: 180, tech: "JSON Schema", pattern: "Specification" }
    ],
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
        file: "src/extension.ts",
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
        file: "engine/ast_scanner.py",
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
        file: "openlens-archy/index.html",
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
        file: "api/gateway.py",
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
        file: "services/retrieval.py",
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
        file: "services/model_adapter.py",
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
        file: "services/snowflake_bridge.py",
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
        file: "rules/architecture_rules.json",
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
