import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { useAuth } from '../hooks/useAuth';
import { firestore } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import Modal from '../components/modal';
import LoadingScreen from '../components/loadingScreen';

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
    const [topic, setTopic] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState(30);

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
                        setCoursesCount(data.courses.length); // Update courses count
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

    // Fetch upcoming classes
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
                        classes.push(data);
                    });
                    const now = new Date();
                    const upcomingClasses = classes
                        .filter(c => c.time > now)
                        .sort((a, b) => a.time - b.time);
                    setUpcomingClass(upcomingClasses);
                } catch (error) {
                    console.error('Error fetching upcoming classes:', error);
                    setError('Failed to fetch upcoming classes. Please try again.');
                }
                finally {
                    setLoading(false);
                }
            }

        };


        if (userData) {
            fetchUpcomingClasses();

        }

    }, [userData]);

    // Fetch announcements
    const fetchAnnouncements = async () => {
        try {
            const announcementsRef = collection(firestore, 'announcements');
            const querySnapshot = await getDocs(announcementsRef);
            const fetchedAnnouncements = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                if (data.date && data.date.toDate) {
                    data.date = data.date.toDate(); // Convert Firestore Timestamp to JavaScript Date
                } else {
                    console.warn('Date format is not a Firestore Timestamp or is missing:', data.date);
                    data.date = new Date(); // Fallback to current date if date is missing
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


    const handleScheduleMeeting = async () => {

        const course = document.querySelector('.select').value;
        try {
            const response = await fetch('http://localhost:4000/schedule-meeting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic,
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
    
            console.log('Meeting details saved to Firestore');
        } catch (error) {
            console.error('Error scheduling meeting:', error);
        }
    };

    const handleStartMeeting = async (upcomingClass) => {

        const userName = userData.Name;
        const { start_url, join_url } = upcomingClass;
        try {
            const startWindow = window.open(start_url, '_blank');

            if (startWindow) {
                return;
            }
        } catch (error) {
            console.error('Failed to start meeting as host:', error);
        }

        const joinUrlWithName = `${join_url}?uname=${encodeURIComponent(userName)}`;
        console.log(joinUrlWithName);
        window.open(joinUrlWithName, '_blank');
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
                        <div>
                            <button>Logout<span className="material-symbols-outlined">logout</span></button>
                        </div>
                    </div>

                    <div className='dashboard-top-cards'>
                        <div className='dashboard-card-courses'>
                            <h3><span className="material-symbols-outlined">school</span> Courses enrolled <span className='count'>({coursesCount}/3)</span></h3>
                            <ul>
                                {userData.courses.map((course, index) => (
                                    <li key={index}>
                                        <p>{course}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className='dashboard-card-courses'>
                            <h3><span className="material-symbols-outlined">assignment_turned_in</span> Submissions <span className='count'>({submissionsCount}/{coursesCount * 3})</span></h3>
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
                                        <div>
                                            <span className="material-symbols-outlined">videocam</span>
                                        </div>
                                        <div>
                                            <p>{upcomingClass.course}</p>
                                            <p className='meeting-time'>{format(upcomingClass.time, 'dd MMMM   HH:mm')}</p>
                                            <button onClick={() => {handleStartMeeting(upcomingClass)}}>Start</button>
                                        </div>
                                    </div>
                                    ))
                                ) : (
                                    <p>No upcoming classes.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modal for adding announcement */}
                    <Modal show={isAnnouncementModalOpen} handleClose={() => setIsAnnouncementModalOpen(false)}>
                        <div className='announcement-modal'>
                            <h2>Add Announcement</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddAnnouncement(); }}>
                                <div>
                                    <label>Type your Announcement here:</label>
                                    <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} required></textarea>
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
                                <div>
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
                                <div>
                                    <label>Start Time:</label>
                                    <input
                                        type='datetime-local'
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
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

                </>
            ) : (
                <p>Loading user data...</p>
            )}
        </div>
    );
}

export default Dashboard;
