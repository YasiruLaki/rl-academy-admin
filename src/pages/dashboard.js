import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { useAuth } from '../hooks/useAuth';
import { firestore } from '../firebase';
import { storage, auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format, set } from 'date-fns';
import Modal from '../components/modal';
import LoadingScreen from '../components/loadingScreen';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { fi, se } from 'date-fns/locale';


function Dashboard() {
    const { currentUser } = useAuth();
    const [userData, setUserData] = useState(null);
    const [upcomingClass, setUpcomingClass] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [coursesCount, setCoursesCount] = useState(0);
    const [submissionsCount, setSubmissionsCount] = useState(0);
    const [announcementText, setAnnouncementText] = useState(''); // State for form input
    const [announcements, setAnnouncements] = useState([]);
    const [upcomingClasses, setUpcomingClasses] = useState([]);
    const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
    const [topic, setTopic] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState(120);
    const [selectedFile, setSelectedFile] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [materialTopic, setMaterialTopic] = useState('');
    const [courseAttendance, setCourseAttendance] = useState([]);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (currentUser) {
                try {
                    const userRef = doc(firestore, 'mentors', currentUser.email);
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (typeof data.courses === 'string') {
                            data.courses = data.courses.split(',').map(course => course.trim());
                        }
                        setUserData(data);
                        setCoursesCount(data.courses.length);
                    } else {
                        setError('User data not found.');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Failed to fetch user data. Please try again.');
                }
            }
        };

        fetchUserData();
    }, [currentUser]);

    
    useEffect(() => {
        const getStudents = async () => {
            try {
                const collectionRef = collection(firestore, 'users');
                const querySnapshot = await getDocs(collectionRef);
                const students = querySnapshot.docs.map(doc => doc.data());
    
                // Get the logged-in user's enrolled courses
                const enrolledCourses = userData.courses || [];
    
                // Initialize an object to store the count of students by course
                const courseCounts = {
                    'Graphic Design': 0,
                    'Video Editing': 0,
                    'Web Development': 0
                };
    
                students.forEach(student => {
                    const coursesString = student.courses;
    
                    // Check if coursesString is a string
                    if (typeof coursesString === 'string') {
                        // Split the string into an array
                        const studentCourses = coursesString.split(',').map(course => course.trim());
    
                        // Increment the count for each course the student is enrolled in
                        studentCourses.forEach(course => {
                            if (enrolledCourses.includes(course)) {
                                if (courseCounts[course] !== undefined) {
                                    courseCounts[course]++;
                                }
                            }
                        });
                    } else {
                        console.warn(`Unexpected data type for courses: ${typeof coursesString}`);
                    }
                });
    
                enrolledCourses.forEach(course => {
                    if (courseCounts[course] !== undefined) {
                        console.log(`${course} Students Count:`, courseCounts[course]);
                    }
                });
            } catch (error) {
                console.error('Error fetching students:', error);
            }
        };
    
        if (userData) {
            getStudents();
        }
    }, [userData]);

    // Fetch announcements
    const fetchAnnouncements = async () => {
        try {
            const announcementsRef = collection(firestore, 'announcements');
            const announcementsQuery = query(announcementsRef, orderBy('date', 'desc'));
            const querySnapshot = await getDocs(announcementsQuery);
            const fetchedAnnouncements = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                if (data.date && data.date.toDate) {
                    data.date = data.date.toDate();
                } else {
                    console.warn('Date format is not a Firestore Timestamp or is missing:', data.date);
                    data.date = new Date();
                }
                fetchedAnnouncements.push(data);
            });
            setAnnouncements(fetchedAnnouncements);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setError('Failed to fetch announcements. Please try again.');
        }
    };

    useEffect(() => {
        fetchAnnouncements();

    }, []);

    const handleAddAnnouncement = async () => {
        const convertUrlsToLinks = (text) => {
            const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
            return text.replace(urlRegex, (url) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
        };

        try {
            const formattedText = convertUrlsToLinks(announcementText);

            await addDoc(collection(firestore, 'announcements'), {
                text: formattedText,
                date: new Date(), // Firestore will convert this to Timestamp
                author: currentUser.email,
            });

            setIsAnnouncementModalOpen(false);
            setAnnouncementText('');
            alert('Announcement added successfully!');
            fetchAnnouncements(); // Fetch updated announcements
        } catch (error) {
            console.error('Error adding announcement:', error);
            setError('Failed to add announcement. Please try again.');
        }
    };

    useEffect(() => {
        const fetchMaterials = async () => {
            if (userData && userData.courses && userData.courses.length > 0) {
                try {
                    const classesRef = collection(firestore, 'materials');
                    const q = query(classesRef, where('course', 'in', userData.courses));
                    const querySnapshot = await getDocs(q);
                    const files = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setMaterials(files);
                } catch (error) {
                    console.error('Error fetching materials:', error);
                }
            }
        };

        fetchMaterials();
    }, [userData]);


    const handleScheduleMeeting = async () => {
        const course = document.querySelector('.select').value;

        try {
            setLoading(true);
            const response = await fetch('https://rla-backend.netlify.app/schedule-meeting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic,
                    description: `${course}`,
                    start_time: new Date(startTime).toISOString(),
                    duration
                })
            });

            const data = await response.json();
            console.log('Meeting scheduled:', data);
            alert(`Meeting scheduled! Join URL: ${data.join_url}`);

            // Add meeting details to Firestore
            await addDoc(collection(firestore, 'classes'), {
                topic,
                time: new Date(startTime),
                duration,
                join_url: data.join_url,
                start_url: data.start_url,
                meeting_id: data.id,
                created_at: new Date(),
                course: course,
            });

            setIsAddClassModalOpen(false);


        } catch (error) {
            console.error('Error scheduling meeting:', error);
        } finally {
            setLoading(false);
        }

    };

    useEffect(() => {
        const fetchUpcomingClasses = async () => {
            if (userData && userData.courses) {
                try {
                    const classesRef = collection(firestore, 'classes');
                    const q = query(classesRef, where('course', 'in', userData.courses));
                    const querySnapshot = await getDocs(q);
                    const classes = [];
                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        data.id = doc.id;


                        if (data.time && data.time.seconds) {
                            data.time = new Date(data.time.seconds * 1000 + data.time.nanoseconds / 1000000);
                        } else {
                            console.warn('Invalid time format:', data.time);
                        }

                        // Set end time to 1 hour after start time
                        const durationMs = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
                        data.endTime = new Date(data.time.getTime() + durationMs);

                        classes.push(data);
                    });

                    console.log('All classes:', classes);

                    const now = new Date();

                    const upcomingClasses = classes
                        .filter(c => c.endTime > now)  // Filter based on end time
                        .sort((a, b) => a.time - b.time);  // Sort based on start time


                    setUpcomingClass(upcomingClasses);
                } catch (error) {
                    setError('Failed to fetch upcoming classes. Please try again.');
                }
                setLoading(false);
            }
        };

        if (userData) {
            fetchUpcomingClasses();
        }
    }, [userData]);

    const checkMeetingStatus = async (meetingId) => {
        try {
            const response = await axios.get(`https://rla-backend.netlify.app/meeting/${meetingId}`);
            return response.data.status; // returns the meeting status
        } catch (error) {
            console.error('Error checking meeting status:', error.response ? error.response.data : error.message);
            return null;
        }
    };

    const fetchParticipantDetails = async (meetingId) => {
        try {
            const response = await axios.get(`https://rla-backend.netlify.app/meeting/${meetingId}/participants`);
            return response.data.participants;
        } catch (error) {
            console.error('Error fetching participant details:', error.response ? error.response.data : error.message);
            return null;
        }
    };

    const handleStartMeeting = async (upcomingClass) => {
        const { meeting_id, start_url, join_url } = upcomingClass;

        try {
            setLoading(true);
            const status = await checkMeetingStatus(meeting_id);

            if (status === 'waiting' || status === 'not started') {
                // Meeting is not started yet, so start the meeting
                const startWindow = window.open(start_url, '_blank');
                if (startWindow) {
                    setLoading(false);
                    return;
                }
            } else if (status === 'started') {
                // Meeting is already started, so join the meeting
                const Name = userData.Name;
                const userName = 'RLA OC - ' + Name;
                const joinUrlWithName = `${join_url}?uname=${encodeURIComponent(userName)}`;
                console.log(joinUrlWithName);
                window.open(joinUrlWithName, '_blank');
                setLoading(false);
            } else {
                console.error('Meeting status unknown or not available');
            }

            // Periodically check the meeting status
            const interval = setInterval(async () => {
                const currentStatus = await checkMeetingStatus(meeting_id);

                if (currentStatus === 'ended') {
                    clearInterval(interval);

                    // Fetch participant details after the meeting ends
                    const participants = await fetchParticipantDetails(meeting_id);
                    console.log('Participants:', participants);
                    // You can further process or display the participant details here
                }
            }, 6000); // Check every 60 seconds

        } catch (error) {
            console.error('Failed to start or join meeting:', error);
        }
    };


    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };


    const handleAddMaterials = async () => {

        setLoading(true);

        const course = document.querySelector('.select').value;
        if (!selectedFile) return;

        try {
            const fileRef = ref(storage, `materials/${selectedFile.name}`);
            const snapshot = await uploadBytes(fileRef, selectedFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Save file metadata to Firestore
            await addDoc(collection(firestore, "materials"), {
                name: selectedFile.name,
                url: downloadURL,
                size: selectedFile.size,
                uploadedBy: auth.currentUser.uid,
                date: new Date(),
                course: course,
                topic: materialTopic,

            });

            // Reset file input
            setSelectedFile(null);
            setIsMaterialsModalOpen(false);
            setLoading(false);
        } catch (error) {
            console.error("Error uploading file: ", error);
        }
    };


    const modules = {
        toolbar: [
            [{ 'header': '1' }, { 'header': '2' }, { 'header': '3' }, { 'font': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['bold', 'italic', 'underline'],
            [{ 'align': [] }],
            [{ 'color': [] }],
            ['clean'] // remove formatting button
        ]
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className='dashboard'>
            {error && <p className="error">{error}</p>}
            {userData ? (
                <>
                    <div className='dashboard-top-text'>
                        <div className='profile-pic'>
                            {/* Profile Picture */}
                        </div>
                        <div>
                            <h1>Welcome Back, ​Mentor</h1>
                            <h2>{userData.Name}</h2>
                        </div>
                        {/* <div>
                            <button>Logout<span className="material-symbols-outlined">logout</span></button>
                        </div> */}
                    </div>

                    <div className='dashboard-top-cards'>
                        <div className='dashboard-card-courses'>
                            <h3><span className="material-symbols-outlined">school</span> Courses assigned <span className='count'>({coursesCount}/3)</span></h3>
                            <ul>
                                {userData.courses.map((course, index) => (
                                    <li key={index}>
                                        <p>{course}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className='dashboard-card-courses'>
                            <h3><span className="material-symbols-outlined">assignment_turned_in</span> Submissions <span className='count'>({submissionsCount})</span></h3>
                            <ul id='courses-progress'>
                                {userData.courses.map((course, index) => (
                                    <li key={index}>
                                        <div className='progress'>
                                            <p>{course}</p>
                                            <div className='progress-bar'>
                                                <div className='progress-bar-fill' style={{ width: `${(userData.submissions?.[course] || 0) / 3 * 100}%` }}></div>
                                            </div>
                                            <div>
                                                <div><p id='progress-count'>{`${((userData.submissions?.[course] || 0) / 3 * 100).toFixed(0)}%`}</p></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className='dashboard-card-courses'>
                            <h3><span className="material-symbols-outlined">check</span> Attendance <span className='count'></span></h3>
                            <ul id='courses-progress'>
                                {userData.courses.map((course, index) => (
                                    <li key={index}>
                                        <div className='progress'>
                                            <p>{course}</p>
                                            <div className='progress-bar'>
                                                <div className='progress-bar-fill' style={{ width: `${(userData.submissions?.[course] || 0) / 3 * 100}%` }}></div>
                                            </div>
                                            <div>
                                                <div><p id='progress-count'>{`${((userData.submissions?.[course] || 0) / 3 * 100).toFixed(0)}%`}</p></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className='dashboard-bottom-cards'>
                        <div className='dashboard-left-cards'>
                            <div className='dashboard-card-announcements'>
                                <h3><span className="material-symbols-outlined">campaign</span> Announcements  <button className='add-btn' onClick={() => setIsAnnouncementModalOpen(true)}><span id='add-btn' className="material-symbols-outlined">add</span></button></h3>
                                {announcements.length > 0 ? (
                                    announcements.map((announcement) => (
                                        <div key={announcement.id} className='announcement'>
                                            <div className='announcement-details'>
                                                <span>{format(announcement.date, 'HH:mm')}</span><span> | </span> <span>{format(announcement.date, 'dd.MM.yyyy')}</span>
                                            </div>
                                            <p dangerouslySetInnerHTML={{ __html: announcement.text }}></p>
                                        </div>
                                    ))
                                ) : (
                                    <p>No announcements available.</p>
                                )}
                            </div>
                        </div>


                        <div className='dashboard-right-cards'>
                            <div className='dashboard-card-upcoming'>
                                <h3><span className="material-symbols-outlined">calendar_month</span> Upcoming class<button className='add-btn' onClick={() => setIsAddClassModalOpen(true)}><span id='add-btn' className="material-symbols-outlined">add</span></button></h3>
                                {upcomingClass ? (
                                    upcomingClass.map((upcomingClass) => (
                                        <div className='upcoming-class'>
                                            <div className='class-1'>
                                                <span className="material-symbols-outlined">videocam</span>
                                                <p id='class-course'>{upcomingClass.course}</p>
                                            </div>
                                            <div className='class-2'>
                                                <div>
                                                    <p className='meeting-time'>{format(upcomingClass.time, 'dd MMMM  |  HH:mm')}</p>
                                                </div>
                                                <div>
                                                    <button className='join-btn' onClick={() => { handleStartMeeting(upcomingClass) }}>Start</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p>No upcoming classes.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='dashboard-left-cards'>
                        <div className='dashboard-card-announcements'>
                            <h3><span className="material-symbols-outlined">Attachment</span>Class Materials<button className='add-btn' onClick={() => setIsMaterialsModalOpen(true)}><span id='add-btn' className="material-symbols-outlined">add</span></button></h3>
                            {materials.length === 0 ? (
                                <div className='no-materials'>
                                    <p>No class materials available.</p>
                                </div>
                            ) : (
                                materials
                                    .filter(material => material.url && material.topic && material.size !== undefined)
                                    .sort((a, b) => b.date - a.date)
                                    .map((material) => (
                                        <div key={material.id}>
                                            <a className='materials-a' href={material.url} target='_blank' rel='noopener noreferrer'>
                                                <div className='materials'>
                                                    <div className='upcoming-class'>
                                                        <div className='materials-1'>
                                                            <div className='materials-div'>
                                                                <span className="material-symbols-outlined">book</span>
                                                                <p className='materials-name'>{material.topic} <span>({material.course})</span></p>
                                                            </div>
                                                            <div className='size-div'>
                                                                <span className='size'>({(material.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    ))
                            )}


                        </div>
                    </div>

                    {/* Modal for adding announcement */}
                    <Modal show={isAnnouncementModalOpen} handleClose={() => setIsAnnouncementModalOpen(false)}>
                        <div className='announcement-modal'>
                            <h2>Add Announcement</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddAnnouncement(); }}>
                                <div>
                                    <label>Type your Announcement here:</label>
                                    <ReactQuill
                                        value={announcementText}
                                        onChange={setAnnouncementText}
                                        theme="snow"
                                        className='text-editor'
                                        modules={modules}
                                        required
                                    />
                                </div>
                                <button className='announcement-modal-button' type="submit">Add Announcement</button>
                            </form>
                        </div>
                    </Modal>

                    {/* Modal for adding classes */}
                    <Modal show={isAddClassModalOpen} handleClose={() => setIsAddClassModalOpen(false)}>
                        <div className='announcement-modal'>
                            <h2>Schedule Zoom Meeting</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleScheduleMeeting(); }}>
                                <div className='addClass-div'>
                                    <label>Select Course:</label>
                                    <select required className='select'>
                                        {userData.courses.map((course, index) => (
                                            <option value={course} key={index}>
                                                {course}
                                            </option>
                                        ))}
                                    </select> <br></br>
                                    <label>Topic:</label>
                                    <input
                                        type='text'
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className='addClass-div'>
                                    <label>Start Time:</label>
                                    <input
                                        type='datetime-local'
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className='addClass-div'>
                                    <label>Duration (minutes):</label>
                                    <input
                                        type='number'
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        required
                                    />
                                </div>
                                <button className='announcement-modal-button' type='submit'>Schedule Meeting</button>
                            </form>
                        </div>
                    </Modal>


                    {/* Modal for adding materials */}
                    <Modal show={isMaterialsModalOpen} handleClose={() => setIsMaterialsModalOpen(false)}>
                        <div className='announcement-modal'>
                            <h2>Add Class Materials</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddMaterials(); }}>
                                <div className='addClass-div'>
                                    <label>Select Course:</label>
                                    <select required className='select'>
                                        {userData.courses.map((course, index) => (
                                            <option value={course} key={index}>
                                                {course}
                                            </option>
                                        ))}
                                    </select> <br></br>
                                </div>
                                <div className='addClass-div'>
                                    <label>Name:</label>
                                    <input
                                        type='text'
                                        value={materialTopic}
                                        onChange={(e) => setMaterialTopic(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className='addClass-div'>
                                    <label>Upload File:</label>
                                    <input type='file' onChange={handleFileChange} required />
                                </div>
                                <button className='announcement-modal-button' type='submit'>Add Material</button>
                            </form>
                        </div>
                    </Modal>

                </>
            ) : (
                <p>Loading user data...</p>
            )}
        </div>
    );
}

export default Dashboard;
