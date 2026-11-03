// --- ANIMACIÓN DEL ESPACIO (Fondo 2D) ---
const imgAsteroide = new Image();
imgAsteroide.src = 'asteroide.com.png'; 
const canvasFondo = document.getElementById('fondo-espacial');
const ctxFondo = canvasFondo.getContext('2d');

function redimensionarFondo() { canvasFondo.width = window.innerWidth; canvasFondo.height = window.innerHeight; }
window.addEventListener('resize', redimensionarFondo); redimensionarFondo();

const estrellas = [];
for (let i = 0; i < 150; i++) {
    estrellas.push({ x: Math.random() * canvasFondo.width, y: Math.random() * canvasFondo.height, radio: Math.random() * 1.2 + 0.3, velocidad: Math.random() * 0.15 + 0.05, opacidad: Math.random(), cambioOpacidad: (Math.random() * 0.01 + 0.005) * (Math.random() < 0.5 ? 1 : -1) });
}
const asteroides = [];

function dibujarEspacio() {
    ctxFondo.clearRect(0, 0, canvasFondo.width, canvasFondo.height);
    estrellas.forEach(e => {
        e.opacidad += e.cambioOpacidad; if(e.opacidad <= 0.1) { e.opacidad = 0.1; e.cambioOpacidad *= -1; } if(e.opacidad >= 1) { e.opacidad = 1; e.cambioOpacidad *= -1; }
        ctxFondo.fillStyle = `rgba(255, 255, 255, ${e.opacidad})`; ctxFondo.beginPath(); ctxFondo.arc(e.x, e.y, e.radio, 0, Math.PI * 2); ctxFondo.fill();
        e.x -= e.velocidad; if (e.x < 0) { e.x = canvasFondo.width; e.y = Math.random() * canvasFondo.height; }
    });

    if (imgAsteroide.complete && Math.random() < 0.05) {
        asteroides.push({ x: canvasFondo.width + 150, y: Math.random() * canvasFondo.height, velocidad: Math.random() * 1 + 0.3, tamaño: Math.random() * 150 + 80, rotacion: Math.random() * Math.PI * 2, velRotacion: (Math.random() - 0.5) * 0.02 });
    }

    for (let i = asteroides.length - 1; i >= 0; i--) {
        let obj = asteroides[i]; obj.x -= obj.velocidad; obj.rotacion += obj.velRotacion;
        ctxFondo.save(); ctxFondo.translate(obj.x, obj.y); ctxFondo.rotate(obj.rotacion);
        ctxFondo.drawImage(imgAsteroide, -obj.tamaño / 2, -obj.tamaño / 2, obj.tamaño, obj.tamaño); ctxFondo.restore();
        if (obj.x < -300) asteroides.splice(i, 1);
    }
    requestAnimationFrame(dibujarEspacio);
}
dibujarEspacio();

// --- LÓGICA DE FIREBASE ---
const firebaseConfig = { databaseURL: "https://nemesis-54598-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let miSalaActual = ""; let miNombre = ""; let miPersonajeAsignado = ""; 

const coloresPersonajes = {
    "Soldado": "#ff3333", "Capitán": "#3366ff", "Explorador": "#9933ff",
    "Ingeniero": "#ff9933", "Científico": "#aaaaaa", "Piloto": "#33ff33"
};

function generarCodigo() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let res = '';
    for (let i = 0; i < 5; i++) res += caracteres.charAt(Math.floor(Math.random() * caracteres.length)); return res;
}

function crearSala() {
    miNombre = document.getElementById('nombre-jugador').value.trim();
    if (!miNombre) return alert("ERROR: IDENTIFICACIÓN REQUERIDA.");
    const codigo = generarCodigo(); miSalaActual = codigo;
    db.ref('salas/' + codigo).set({ creador: miNombre, estado: 'esperando', jugadores: { [miNombre]: "Sin asignar" } });
    document.getElementById('menu-principal').style.display = 'none'; document.getElementById('sala-espera').style.display = 'block';
    document.getElementById('mostrar-codigo').innerText = codigo; document.getElementById('btn-empezar').style.display = 'block'; 
    escucharCambiosSala(codigo);
}

function unirseSala() {
    miNombre = document.getElementById('nombre-jugador').value.trim();
    const codigo = document.getElementById('codigo-input').value.toUpperCase();
    if (!miNombre || codigo.length !== 5) return alert("ERROR EN CREDENCIALES.");
    db.ref('salas/' + codigo).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            miSalaActual = codigo;
            db.ref('salas/' + codigo + '/jugadores').update({ [miNombre]: "Sin asignar" });
            document.getElementById('menu-principal').style.display = 'none'; document.getElementById('sala-espera').style.display = 'block';
            document.getElementById('mostrar-codigo').innerText = codigo; document.getElementById('btn-empezar').style.display = 'none'; 
            escucharCambiosSala(codigo);
        } else alert("NAVE NO ENCONTRADA.");
    });
}

function empezarJuego() {
    db.ref('salas/' + miSalaActual + '/jugadores').once('value').then((snapshot) => {
        const lista = Object.keys(snapshot.val());
        let disp = ["Soldado", "Capitán", "Explorador", "Ingeniero", "Científico", "Piloto"].sort(() => Math.random() - 0.5);
        db.ref('salas/' + miSalaActual).update({
            estado: 'seleccion',
            seleccion: { orden: lista, turnoActual: 0, personajesDisponibles: disp, opcionesActuales: disp.splice(0, 2) }
        });
    });
}

function seleccionarPersonaje(personaje) {
    miPersonajeAsignado = personaje;
    db.ref('salas/' + miSalaActual + '/seleccion').once('value').then((snapshot) => {
        let sel = snapshot.val();
        db.ref('salas/' + miSalaActual + '/jugadores').update({ [miNombre]: personaje });
        
        let descartado = sel.opcionesActuales.find(p => p !== personaje);
        if(descartado) sel.personajesDisponibles.push(descartado);
        
        let sigTurno = sel.turnoActual + 1;
        if (sigTurno >= sel.orden.length) {
            db.ref('salas/' + miSalaActual).update({ estado: 'jugando' });
        } else {
            sel.personajesDisponibles = sel.personajesDisponibles.sort(() => Math.random() - 0.5);
            db.ref('salas/' + miSalaActual + '/seleccion').update({ turnoActual: sigTurno, personajesDisponibles: sel.personajesDisponibles, opcionesActuales: sel.personajesDisponibles.splice(0, 2) });
        }
    });
}

let motor3DIniciado = false; 

function escucharCambiosSala(codigo) {
    db.ref('salas/' + codigo).on('value', (snapshot) => {
        const sala = snapshot.val();
        if(!sala) return;

        const lista = document.getElementById('lista-jugadores'); lista.innerHTML = ''; 
        for (let j in sala.jugadores) {
            let rol = sala.jugadores[j] !== "Sin asignar" ? ` - <span style="color:${coloresPersonajes[sala.jugadores[j]]}">${sala.jugadores[j]}</span>` : '';
            lista.innerHTML += `<li>${j}${rol}</li>`;
        }

        if (sala.estado === 'seleccion') {
            document.getElementById('sala-espera').style.display = 'none';
            document.getElementById('pantalla-seleccion').style.display = 'block';

            const sel = sala.seleccion;
            const jugadorTurno = sel.orden[sel.turnoActual];
            const area = document.getElementById('area-seleccion');

            if (jugadorTurno === miNombre) {
                area.innerHTML = `<p style="color: #fff;">REQUIERE TU CONFIRMACIÓN DE ROL.</p>`;
                sel.opcionesActuales.forEach(p => {
                    area.innerHTML += `<button style="color: ${coloresPersonajes[p]}; border-color: ${coloresPersonajes[p]};" onclick="seleccionarPersonaje('${p}')">${p}</button>`;
                });
            } else {
                area.innerHTML = `<p class="texto-secundario" style="font-size: 16px; border: 1px solid rgba(51,255,51,0.3); padding: 20px;">ESPERANDO A QUE <b>${jugadorTurno}</b> ELIJA SU ROL...</p>`;
            }
            
            const resumen = document.getElementById('resumen-elecciones');
            resumen.innerHTML = "<b>ESTADO DE LA TRIPULACIÓN:</b><br>";
            for (let j in sala.jugadores) {
                let r = sala.jugadores[j];
                if(r !== "Sin asignar") resumen.innerHTML += `${j}: <span style="color:${coloresPersonajes[r]}">${r}</span><br>`;
            }
        } 
        else if (sala.estado === 'jugando') {
            document.getElementById('fondo-espacial').style.display = 'none';
            document.getElementById('pantalla-seleccion').style.display = 'none';
            document.getElementById('pantalla-juego').style.display = 'block';
            
            if (!motor3DIniciado) {
                motor3DIniciado = true;
                let colorFinal = coloresPersonajes[miPersonajeAsignado] || "#aaaaaa"; 
                document.getElementById('info-rol').innerHTML = `IDENTIFICACIÓN: ${miNombre} | ROL: <span style="color:${colorFinal}">${miPersonajeAsignado || "Desconocido"}</span>`;
                
                const tituloZona = document.getElementById('titulo-zona');
                tituloZona.style.display = 'block';
                setTimeout(() => tituloZona.style.opacity = '1', 500); 
                setTimeout(() => {
                    tituloZona.style.opacity = '0'; 
                    setTimeout(() => tituloZona.style.display = 'none', 2000);
                }, 4000); 

                let numJugadores = Object.keys(sala.jugadores).length;
                iniciarMotor3D(numJugadores);
            }
        }
    });
}

// --- MOTOR 3D Y GENERADOR DE SALAS HEXAGONALES ---
function iniciarMotor3D(cantidadJugadores) {
    const contenedor = document.getElementById('tablero-juego');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204);
    scene.fog = new THREE.Fog(0x020204, 15, 45);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    contenedor.appendChild(renderer.domElement);

    const materialSuelo = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'pngwing.com.png', 
        function (textura) {
            textura.wrapS = THREE.RepeatWrapping;
            textura.wrapT = THREE.RepeatWrapping;
            textura.repeat.set(20, 20); 
            materialSuelo.map = textura;
            materialSuelo.needsUpdate = true;
        }
    );

    const matParedPanel = new THREE.MeshLambertMaterial({ color: 0x2b313a });
    const matBordePanel = new THREE.MeshLambertMaterial({ color: 0x111418 });
    const matTechoPlaca = new THREE.MeshLambertMaterial({ color: 0x181c22 });
    const matViga = new THREE.MeshLambertMaterial({ color: 0x3a424f });
    const geomPuerta = new THREE.PlaneGeometry(6, 10);
    const materialPuerta = new THREE.MeshLambertMaterial({ color: 0x1f382b });

    const posicionesFocosTecho = [
        { x: -12, z: -12 }, { x: 12, z: -12 },
        { x: -12, z: 12 }, { x: 12, z: 12 },
        { x: 0, z: 0 }, { x: -12, z: 0 }, { x: 12, z: 0 }
    ];

    function crearSalaHexagonal(offsetX, offsetZ, esHibernatorio) {
        const grupoSala = new THREE.Group();

        const suelo = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), materialSuelo);
        suelo.rotation.x = -Math.PI / 2; 
        grupoSala.add(suelo);

        const techo = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), matTechoPlaca);
        techo.rotation.x = Math.PI / 2; 
        techo.position.y = 15; 
        grupoSala.add(techo);

        for (let i = -15; i <= 15; i += 10) {
            let vigaX = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 1.2), matViga);
            vigaX.position.set(0, 14.6, i); grupoSala.add(vigaX);

            let vigaZ = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 40), matViga);
            vigaZ.position.set(i, 14.6, 0); grupoSala.add(vigaZ);
        }

        const paredN = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), matBordePanel);
        paredN.position.set(0, 7.5, -20); grupoSala.add(paredN);

        const paredS = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), matBordePanel);
        paredS.position.set(0, 7.5, 20); paredS.rotation.y = Math.PI; grupoSala.add(paredS);

        const paredE = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), matBordePanel);
        paredE.position.set(-20, 7.5, 0); paredE.rotation.y = Math.PI / 2; grupoSala.add(paredE);

        const paredO = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), matBordePanel);
        paredO.position.set(20, 7.5, 0); paredO.rotation.y = -Math.PI / 2; grupoSala.add(paredO);

        let puerta1 = new THREE.Mesh(geomPuerta, materialPuerta);
        puerta1.position.set(-8, 5, 19.85); puerta1.rotation.y = Math.PI; grupoSala.add(puerta1);

        let puerta2 = new THREE.Mesh(geomPuerta, materialPuerta);
        puerta2.position.set(8, 5, 19.85); puerta2.rotation.y = Math.PI; grupoSala.add(puerta2);

        let puertaE = new THREE.Mesh(geomPuerta, materialPuerta);
        puertaE.position.set(-19.85, 5, 0); puertaE.rotation.y = Math.PI / 2; grupoSala.add(puertaE);

        let puertaO = new THREE.Mesh(geomPuerta, materialPuerta);
        puertaO.position.set(19.85, 5, 0); puertaO.rotation.y = -Math.PI / 2; grupoSala.add(puertaO);

        posicionesFocosTecho.forEach((pos, index) => {
            const focoBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16), matViga);
            focoBase.position.set(pos.x + offsetX, 14.85, pos.z + offsetZ); 
            scene.add(focoBase);

            let encendido = esHibernatorio ? true : (index % 2 === 0 || Math.random() > 0.4); 

            const colorLed = encendido ? 0x88ccff : 0x333333;
            const focoLed = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 16), new THREE.MeshBasicMaterial({ color: colorLed }));
            focoLed.position.set(pos.x + offsetX, 14.65, pos.z + offsetZ); 
            scene.add(focoLed);

            if (encendido) {
                const luz = new THREE.PointLight(0x88bbff, 0.8, 30);
                luz.position.set(pos.x + offsetX, 14.0, pos.z + offsetZ); 
                scene.add(luz);
            }
        });

        grupoSala.position.set(offsetX, 0, offsetZ);
        scene.add(grupoSala);
    }

    crearSalaHexagonal(0, 0, true);
    crearSalaHexagonal(0, -40, false);  
    crearSalaHexagonal(0, 40, false);   
    crearSalaHexagonal(-40, 0, false);  
    crearSalaHexagonal(40, 0, false);   

    const ambientLight = new THREE.AmbientLight(0x223344, 0.5);
    scene.add(ambientLight);

    const matMetalInferior = new THREE.MeshStandardMaterial({ color: 0x7c8690, metalness: 0.85, roughness: 0.2 });
    const matCristalLiquido = new THREE.MeshPhysicalMaterial({ color: 0x66bbff, transmission: 0.7, opacity: 0.85, transparent: true, roughness: 0.1, ior: 1.33 });
    const matAnilloLuz = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    let espacioTotal = 32;
    let separacion = cantidadJugadores > 1 ? espacioTotal / (cantidadJugadores - 1) : 0;
    let inicioX = -espacioTotal / 2;

    for(let i = 0; i < cantidadJugadores; i++) {
        let posX = cantidadJugadores === 1 ? 0 : inicioX + (i * separacion);
        let posZ = -17.5;

        const grupoCapsula = new THREE.Group();
        let baseInferior = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.2, 32), matMetalInferior);
        baseInferior.position.y = 0.6; grupoCapsula.add(baseInferior);

        let luzInf = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.25, 32), matAnilloLuz);
        luzInf.position.y = 1.25; grupoCapsula.add(luzInf);

        let cilindroCristal = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 10.0, 32, 1, true), matCristalLiquido);
        cilindroCristal.position.y = 6.35; grupoCapsula.add(cilindroCristal);

        let luzSup = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.25, 32), matAnilloLuz);
        luzSup.position.y = 11.45; grupoCapsula.add(luzSup);

        let tapaSuperior = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.2, 1.3, 32), matMetalInferior);
        tapaSuperior.position.y = 12.25; grupoCapsula.add(tapaSuperior);

        grupoCapsula.position.set(posX, 0, posZ);
        scene.add(grupoCapsula);
    }

    const grupoEstrada = new THREE.Group();
    const matTrajeEstrada = new THREE.MeshLambertMaterial({ color: 0xcc3333 }); 
    const matCascoEstrada = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const matVisorRotto = new THREE.MeshLambertMaterial({ color: 0x050505 });

    let cuerpoEstrada = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.5, 16), matTrajeEstrada);
    cuerpoEstrada.rotation.z = Math.PI / 2; cuerpoEstrada.position.set(0, 1.2, 0); grupoEstrada.add(cuerpoEstrada);

    let cascoEstrada = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 16), matCascoEstrada);
    cascoEstrada.position.set(2.0, 1.2, 0); grupoEstrada.add(cascoEstrada);

    let visorEstrada = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 1.2), matVisorRotto);
    visorEstrada.position.set(2.8, 1.2, 0); grupoEstrada.add(visorEstrada);

    grupoEstrada.position.set(0, 0, 0);
    grupoEstrada.rotation.y = Math.PI / 4;
    scene.add(grupoEstrada);

    // --- NUEVO MODELO DE ASTRONAUTA DETALLADO (Estilo Cooperativo / Tanques de Oxígeno) ---
    function crearModeloHumano(colorHex) {
        const grupo = new THREE.Group();
        const materialTraje = new THREE.MeshLambertMaterial({ color: colorHex });
        const matCorreas = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const matTanque = new THREE.MeshStandardMaterial({ color: 0xd4d42a, roughness: 0.3 }); // Tanques amarillos clásicos
        const matTapaTanque = new THREE.MeshLambertMaterial({ color: 0x222222 });

        // 1. Torso del astronauta
        const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 3.5, 16), materialTraje);
        cuerpo.position.y = 1.9; 
        grupo.add(cuerpo);

        // 2. Doble Tanque de Oxígeno trasero (Estilo Lethal Company / REPO)
        const tanque1 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.8, 16), matTanque);
        tanque1.position.set(-0.35, 2.1, -0.9);
        tanque1.rotation.x = 0.1;
        grupo.add(tanque1);

        const tapa1 = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.45, 0.3, 16), matTapaTanque);
        tapa1.position.set(-0.35, 3.55, -0.95);
        grupo.add(tapa1);

        const tanque2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.8, 16), matTanque);
        tanque2.position.set(0.35, 2.1, -0.9);
        tanque2.rotation.x = 0.1;
        grupo.add(tanque2);

        const tapa2 = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.45, 0.3, 16), matTapaTanque);
        tapa2.position.set(0.35, 3.55, -0.95);
        grupo.add(tapa2);

        // 3. Correas / Arneses cruzados en la espalda
        const correa1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.1), matCorreas);
        correa1.position.set(0, 2.5, -0.85);
        correa1.rotation.z = 0.4;
        grupo.add(correa1);

        const correa2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.1), matCorreas);
        correa2.position.set(0, 2.5, -0.85);
        correa2.rotation.z = -0.4;
        grupo.add(correa2);

        // 4. Casco robusto y cabeza
        const casco = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 24), new THREE.MeshLambertMaterial({ color: 0x1f232a }));
        casco.position.y = 4.7; 
        grupo.add(casco);

        // 5. Ojos expresivos dentro del visor oscuro
        const materialOjo = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const ojoIzq = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), materialOjo);
        ojoIzq.position.set(-0.3, 4.8, -0.92);
        grupo.add(ojoIzq);

        const ojoDer = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), materialOjo);
        ojoDer.position.set(0.3, 4.8, -0.92);
        grupo.add(ojoDer);

        // Pupilas
        const materialPupila = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupilaIzq = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), materialPupila);
        pupilaIzq.position.set(-0.3, 4.8, -1.04);
        grupo.add(pupilaIzq);

        const pupilaDer = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), materialPupila);
        pupilaDer.position.set(0.3, 4.8, -1.04);
        grupo.add(pupilaDer);

        // Boca expresiva
        const boca = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.07, 0.1), materialPupila);
        boca.position.set(0, 4.38, -0.96);
        grupo.add(boca);

        return grupo;
    }

    const anguloAleatorio = Math.random() * Math.PI * 2;
    const distanciaAleatoria = 6 + Math.random() * 4; 
    const posXInicial = Math.cos(anguloAleatorio) * distanciaAleatoria;
    const posZInicial = Math.sin(anguloAleatorio) * distanciaAleatoria;

    camera.position.set(posXInicial, 6, posZInicial); 
    camera.rotation.order = 'YXZ'; 
    let yaw = 0; let pitch = 0;
    const teclas = { w: false, a: false, s: false, d: false };
    const velocidad = 0.2;
    const radioColision = 2.0;

    contenedor.addEventListener('click', () => contenedor.requestPointerLock());
    document.addEventListener('pointerlockchange', () => {
        document.getElementById('instrucciones-3d').style.display = document.pointerLockElement === contenedor ? 'none' : 'block';
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === contenedor) {
            yaw -= e.movementX * 0.002; pitch -= e.movementY * 0.002;
            pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
            camera.rotation.set(pitch, yaw, 0);
        }
    });

    window.addEventListener('keydown', (e) => {
        if(e.key.toLowerCase() === 'w') teclas.w = true;
        if(e.key.toLowerCase() === 'a') teclas.a = true;
        if(e.key.toLowerCase() === 's') teclas.s = true;
        if(e.key.toLowerCase() === 'd') teclas.d = true;
    });

    window.addEventListener('keyup', (e) => {
        if(e.key.toLowerCase() === 'w') teclas.w = false;
        if(e.key.toLowerCase() === 'a') teclas.a = false;
        if(e.key.toLowerCase() === 's') teclas.s = false;
        if(e.key.toLowerCase() === 'd') teclas.d = false;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const otrosJugadoresModelos = {};
    db.ref('salas/' + miSalaActual + '/posiciones').on('value', (snapshot) => {
        const posiciones = snapshot.val() || {};
        for (let nombre in posiciones) {
            if (nombre === miNombre) continue; 
            if (!otrosJugadoresModelos[nombre]) {
                db.ref('salas/' + miSalaActual + '/jugadores/' + nombre).once('value').then(snapRol => {
                    let rol = snapRol.val(); let color = coloresPersonajes[rol] || "#aaaaaa";
                    let modelo = crearModeloHumano(color); scene.add(modelo); otrosJugadoresModelos[nombre] = modelo;
                });
            } else {
                otrosJugadoresModelos[nombre].position.x = posiciones[nombre].x;
                otrosJugadoresModelos[nombre].position.z = posiciones[nombre].z;
                otrosJugadoresModelos[nombre].rotation.y = posiciones[nombre].r;
            }
        }
    });

    function colisionaConAlguien(testX, testZ) {
        for (let nombre in otrosJugadoresModelos) {
            let otro = otrosJugadoresModelos[nombre];
            let dx = testX - otro.position.x; let dz = testZ - otro.position.z;
            if (Math.sqrt(dx*dx + dz*dz) < radioColision) return true;
        }
        return false;
    }

    const direccion = new THREE.Vector3(); const derecha = new THREE.Vector3();
    let lastX = 0, lastZ = 0, lastYaw = 0; 
    const raycaster = new THREE.Raycaster();
    const centroPantalla = new THREE.Vector2(0, 0);

    function animar3D() {
        requestAnimationFrame(animar3D);

        camera.getWorldDirection(direccion);
        direccion.y = 0; direccion.normalize();
        derecha.crossVectors(direccion, camera.up).normalize();

        let movX = 0; let movZ = 0;
        if (teclas.w) { movX += direccion.x * velocidad; movZ += direccion.z * velocidad; }
        if (teclas.s) { movX -= direccion.x * velocidad; movZ -= direccion.z * velocidad; }
        if (teclas.a) { movX -= derecha.x * velocidad; movZ -= derecha.z * velocidad; }
        if (teclas.d) { movX += derecha.x * velocidad; movZ += derecha.z * velocidad; }

        let testX = camera.position.x + movX;
        let testZ = camera.position.z + movZ;

        if (testX < -58 || testX > 58) movX = 0;
        if (testZ < -58 || testZ > 58) movZ = 0;

        if (colisionaConAlguien(camera.position.x + movX, camera.position.z)) movX = 0;
        if (colisionaConAlguien(camera.position.x, camera.position.z + movZ)) movZ = 0;

        camera.position.x += movX;
        camera.position.z += movZ;

        raycaster.setFromCamera(centroPantalla, camera);
        const intersects = raycaster.intersectObjects(grupoEstrada.children, true);
        const uiInteraccion = document.getElementById('interaccion-ui');
        
        if (intersects.length > 0 && intersects[0].distance < 6.0) {
            uiInteraccion.style.display = 'block';
        } else {
            uiInteraccion.style.display = 'none';
        }

        if (Math.abs(camera.position.x - lastX) > 0.05 || Math.abs(camera.position.z - lastZ) > 0.05 || Math.abs(yaw - lastYaw) > 0.05) {
            db.ref('salas/' + miSalaActual + '/posiciones/' + miNombre).set({
                x: camera.position.x, z: camera.position.z, r: yaw
            });
            lastX = camera.position.x; lastZ = camera.position.z; lastYaw = yaw;
        }

        renderer.render(scene, camera);
    }
    animar3D();
}
