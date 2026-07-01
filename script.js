import { db } from "./firebase.js";
import { auth} from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { collection,onSnapshot, getDocs,addDoc,setDoc,doc} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";




document.addEventListener("DOMContentLoaded", function () {
  let btn = document.querySelector("#btn");
  let sidebar = document.querySelector(".sidebar");

  btn.onclick = function () {
    sidebar.classList.toggle("active");
  };
});






const routesColRef = collection(db, "routes");
 function initializeMapAndFirestore() {
  
    
    var map = L.map("map", {
        center: [16.704, 74.243], 
        zoom: 10,
    });

    // --- Define multiple base layers ---
    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution:
            'Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    });

    var satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            attribution:
                "&copy; <a href='https://www.esri.com/'>Esri</a> Satellite Imagery",
        }
    );

    var googleSat = L.tileLayer(
        "http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}/{z}={z}",
        {
            attribution: "&copy; Google Satellite",
        }
    );


    osm.addTo(map);

    
    var baseMaps = {
        "OpenStreetMap": osm,
        "Topo Map": topo,
        "Satellite": satellite,
        "Google Satellite": googleSat,
    };

    var busMarkerGroup = L.layerGroup().addTo(map);
    var routeLineGroup = L.layerGroup().addTo(map);
    var stopMarkerGroup = L.layerGroup().addTo(map); 
    
    
    var busMarkers = {}; 
    var routeLayers = {};
    var stopsByRoute = {}; 
    
    
    const stopIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        shadowSize: [41, 41]
    });


    
    if (routesColRef) { 
        
        console.log("Starting real-time listener for unique bus documents...");

        onSnapshot(routesColRef, (snapshot) => {
            
            snapshot.docChanges().forEach((change) => {
                const markerKey = change.doc.id; 
                const data = change.doc.data();
                
                const busLocation = data.location || data.bus_location; 
                const routeName = data.route_name; 
                const routePoints = data.route_points;
                const stops = data.stops; 
                
                
            

                if (change.type === "added" || change.type === "modified") {
                    
                    
                    if (busLocation && typeof busLocation.latitude !== 'undefined') {
                    
                        const lat = busLocation.latitude;
                        const lng = busLocation.longitude;
                        const latlng = [lat, lng];
                        
                        const tooltipText = `Route: ${routeName || 'N/A'}<br>Tracker ID: ${markerKey}<br>Lat: ${lat}, Lng: ${lng}`;

                        let marker = busMarkers[markerKey];

                        if (marker) {
                            marker.setLatLng(latlng);
                            marker.getTooltip().setContent(tooltipText);
                        } else {
                            const busIcon = L.icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', shadowSize: [41, 41]
                            });

                            marker = L.marker(latlng, { icon: busIcon })
                                .bindTooltip(tooltipText, { direction: "top", sticky: true, offset: [0, -15] })
                                .addTo(busMarkerGroup);
                            
                            busMarkers[markerKey] = marker; 
                        }
                    }

                    
                    if (routePoints && Array.isArray(routePoints) && routePoints.length > 1) {
                        const leafletPoints = routePoints.map(p => [p.latitude, p.longitude]);
                        let polyline = routeLayers[markerKey];
                        
                        if (polyline) {
                            polyline.setLatLngs(leafletPoints);
                        } else {
                            polyline = L.polyline(leafletPoints, {
                                color: 'blue', weight: 4, opacity: 0.7, dashArray: '10, 5',
                            })
                            .bindPopup(`Route: ${routeName} Path`)
                            .addTo(routeLineGroup);
                            
                            routeLayers[markerKey] = polyline;
                        }
                    }
                    
                   
                    
                
                    if (stopsByRoute[markerKey]) {
                        stopsByRoute[markerKey].forEach(m => stopMarkerGroup.removeLayer(m));
                        stopsByRoute[markerKey] = [];
                    } else {
                        stopsByRoute[markerKey] = [];
                    }

                
                    if (stops && Array.isArray(stops)) {
                        stops.forEach(stop => {
                            if (stop.latitude && stop.longitude && stop.name) {
                                const stopLatlng = [stop.latitude, stop.longitude];
                                const stopMarker = L.marker(stopLatlng, { icon: stopIcon })
                                    .bindPopup(`<b>Stop: ${stop.name}</b><br>Students: ${stop.student_count || 0}`)
                                    .addTo(stopMarkerGroup);
                                
                                
                                stopsByRoute[markerKey].push(stopMarker); 
                            }
                        });
                    }


                } else if (change.type === "removed") {
                    
                    
                    const markerToRemove = busMarkers[markerKey];
                    if (markerToRemove) {
                        busMarkerGroup.removeLayer(markerToRemove);
                        delete busMarkers[markerKey];
                    }
                    
                    
                    const lineToRemove = routeLayers[markerKey];
                    if (lineToRemove) {
                        routeLineGroup.removeLayer(lineToRemove);
                        delete routeLayers[markerKey];
                    }

            
                    if (stopsByRoute[markerKey]) {
                        stopsByRoute[markerKey].forEach(m => stopMarkerGroup.removeLayer(m));
                        delete stopsByRoute[markerKey];
                    }
                    
                    console.log(`Removed tracking for ${markerKey}`);
                }
            });

            
            if (Object.keys(busMarkers).length > 0) {
                try {
                    const bounds = busMarkerGroup.getBounds();
                    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
                } catch (e) {
                    
                }
            }

        }, (error) => {
            console.error("Firestore real-time listener failed:", error);
        });
        
    } else {
        console.error("Firestore reference is not defined. Check your firebase.js and imports.");
    }
    

    var marks = [ ];
    var markerGroup = L.layerGroup();
    for (var i = 0; i < marks.length; i++) {
        L.marker(marks[i].latlng)
          .bindTooltip(marks[i].text, { direction: "top", sticky: false, offset: [0, -15] })
          .addTo(markerGroup);
    }
    markerGroup.addTo(map);

    var overlayMaps = {
        "Buildings": markerGroup, 
        "Live Bus Locations": busMarkerGroup, 
        "Planned Route Paths": routeLineGroup,
        "Bus Stops": stopMarkerGroup, 
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);
}



initializeMapAndFirestore();


const tableBody = document.getElementById('tableBody');


async function loadDriversTable() {
    
    tableBody.innerHTML = ''; 

    try {
        
        const driversCollectionRef = collection(db, "drivers");
        const driverSnapshot = await getDocs(driversCollectionRef);

  
        if (driverSnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4">No driver data found.</td></tr>';
            return;
        }

        driverSnapshot.docs.forEach(doc => {
            const driverData = doc.data();

            const routeName = driverData.routeName || 'N/A';
            const name = driverData.name || 'N/A';
            const phone = driverData.phone || 'N/A';
            const busNumber = driverData.busNumber || 'N/A';

           
            const newRow = tableBody.insertRow(); 

            
            newRow.insertCell().textContent = routeName;  
            newRow.insertCell().textContent = name;        
            newRow.insertCell().textContent = phone;       
            newRow.insertCell().textContent = busNumber;   
        });

    } catch (error) {
        console.error("Error fetching documents: ", error);
        tableBody.innerHTML = `<tr><td colspan="4">Error loading data: ${error.message}</td></tr>`;
    }
}


document.addEventListener('DOMContentLoaded', loadDriversTable);






const addNewRouteBtn = document.getElementById('addNewRouteBtn');
const addRouteFormContainer = document.getElementById('addRouteFormContainer');
const newDriverForm = document.getElementById('newDriverForm');
const cancelAddBtn = document.getElementById('cancelAdd');



addNewRouteBtn.addEventListener('click', () => {
    
    addRouteFormContainer.style.display = 'block';
});

cancelAddBtn.addEventListener('click', () => {
   
    addRouteFormContainer.style.display = 'none';
    newDriverForm.reset();
});


// --- Handling Form Submission and Firestore Write ---

newDriverForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    
    const routeName = document.getElementById('routeName').value;
    const driverName = document.getElementById('driverName').value;
    
    const driverPhone = document.getElementById('driverPhone').value; 
    const busNumber = document.getElementById('busNumber').value;
    const email = document.getElementById('email').value;
    const licenceNumber = document.getElementById('licenceNumber').value;
    const driverPassword = document.getElementById('driverPassword').value;
    const confirmDriverPassword = document.getElementById('confirmDriverPassword').value;


    if (driverPassword !== confirmDriverPassword) {
        alert("Passwords do not match!");
        return;
    }
    if (driverPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }


    
    const newDriverData = {
        routeName: routeName,
        name: driverName,
        phone: driverPhone,
        busNumber: busNumber,
        email: email,
        licenceNumber: licenceNumber,
        
        createdAt: new Date().toISOString(), 
        role: "driver"
    };

    try {

        const driverCredential = await createUserWithEmailAndPassword(auth, email, driverPassword);
        const driverUser = driverCredential.user;
        console.log("Driver successfully created in Auth with UID:", driverUser.uid);
        
        const docRef = await addDoc(collection(db, "drivers"), newDriverData);
        
        console.log("Document successfully written with ID: ", docRef.id);
        alert("New driver/route added successfully!");

        
        newDriverForm.reset();
        addRouteFormContainer.style.display = 'none'; 

        
        if (typeof loadDriversTable === 'function') {
            await loadDriversTable(); 
        }

    } catch (error) {
            console.error("Error creating user or adding document:", error);
            
            let errorMessage = "Error adding student. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Error: The email address is already in use by another account.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Error: The email address is not valid.";
            }
            alert(errorMessage);
        }
});



// TableBody for Students
const tableBodyStudent = document.getElementById('tableBodyStudent');


async function loadStudentsTable() {

    tableBodyStudent.innerHTML = ''; 

    try {

        const studentsCollectionRef = collection(db, "users");
        const studentSnapshot = await getDocs(studentsCollectionRef);


        if (studentSnapshot.empty) {
            tableBodyStudent.innerHTML = '<tr><td colspan="4">No student data found.</td></tr>';
            return;
        }

        studentSnapshot.docs.forEach(doc => {
            const studentData = doc.data();

            const routeName = studentData.routeName || 'N/A';
            const studentName = studentData.name || 'N/A';
            const mobile = studentData.phone_number || 'N/A';
            const email = studentData.email || 'N/A';


            const newRow = tableBodyStudent.insertRow();

            newRow.insertCell().textContent = routeName;  
            newRow.insertCell().textContent = studentName;        
            newRow.insertCell().textContent = mobile;       
            newRow.insertCell().textContent = email;   
        })
    } catch (error) {
        console.error("Error fetching documents: ", error);
        tableBodyStudent.innerHTML = `<tr><td colspan="4">Error loading data: ${error.message}</td></tr>`;
    }
}


document.addEventListener('DOMContentLoaded', loadStudentsTable);








const newStudentForm = document.querySelector('.newStudentForm');
const addStudentFormContainer = document.querySelector('.addNewStudentContainer'); 
const cancelButton = document.getElementById('cancelAdd');


if (newStudentForm && addStudentFormContainer) {
    newStudentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const studentName = document.getElementById('studentName').value;
        const studentPhone = document.getElementById('studentPhone').value;
        const studentEmail = document.getElementById('studentEmail').value;
        const studentRoute = document.getElementById('studentRouteName').value; 
        
        
        const password = document.getElementById('studentPassword').value;
        const confirmPassword = document.getElementById('confirmStudentPassword').value;

        
        if (password !== confirmPassword) {
            alert("Error: Passwords do not match!");
            return;
        }
        
        if (password.length < 6) {
            alert("Error: Password must be at least 6 characters long.");
            return;
        }

    
        const newStudentData = {
            name: studentName,
            phone_number: studentPhone,
            email: studentEmail,
            routeName: studentRoute,
            createdAt: new Date().toISOString(),
        };
        
        try {
            // CREATE USER IN FIREBASE AUTHENTICATION
            const userCredential = await createUserWithEmailAndPassword(auth, studentEmail, password);
            const user = userCredential.user;
            
            console.log("User successfully created in Auth with UID:", user.uid);
            

            await setDoc(doc(db, "users", user.uid), newStudentData);

            console.log("User details saved to Firestore with UID:", user.uid);
            alert("New student added and account created successfully! ");

            
            newStudentForm.reset();
            addRouteFormContainer.style.display = 'none'; 

            if (typeof loadStudentsTable === 'function') {
                await loadStudentsTable();
            }

        } catch (error) {
            console.error("Error creating user or adding document:", error);
            
            let errorMessage = "Error adding student. Please try again.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Error: The email address is already in use by another account.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Error: The email address is not valid.";
            }
            alert(errorMessage);
        }
    });
} else {
    console.error("The form or container elements were not found in the DOM.");
}


if (cancelButton && newStudentForm && addStudentFormContainer) {
    cancelButton.addEventListener('click', () => {
        newStudentForm.reset();
        addRouteFormContainer.style.display = 'none';
    });
}


async function updateCardNumbers() {
  const activeRoutesCard = document.getElementById('activeRoutesCard');
  const totalDriversCard = document.getElementById('totalDriversCard');
  const totalStudentsCard = document.getElementById('totalStudentCard');

  
  const docRoutes = await getDocs(collection(db, "routes"));
  const docDrivers = await getDocs(collection(db, "drivers"));
  const docStudents = await getDocs(collection(db, "users"));

  
  if (activeRoutesCard) {
    activeRoutesCard.textContent = docRoutes.docs.length;
  }

  if (totalDriversCard) {
    totalDriversCard.textContent = docDrivers.docs.length;
  }

  if (totalStudentsCard) {
    totalStudentsCard.textContent = docStudents.docs.length;
  }
}

updateCardNumbers();
















