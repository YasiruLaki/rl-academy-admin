import React, { useState, useEffect } from 'react';
import './dashboard.css';
import './submissions.css';
import { useAuth } from '../hooks/useAuth';
import { firestore } from '../firebase';
import { doc, setDoc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import Modal from '../components/modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LoadingScreen from '../components/loadingScreen';

function Submissions() {
    const { currentUser } = useAuth();
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDes, setAssignmentDes] = useState('');
    const [assignments, setAssignments] = useState([]);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            if (currentUser) {
                setLoading(true);
                try {
                    const userRef = doc(firestore, 'mentors', currentUser.email);
                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (typeof data.courses === 'string') {
                            data.courses = data.courses.split(',').map(course => course.trim());
                        }
                        setUserData(data);
                    } else {
                        setError('User data not found.');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Failed to fetch user data. Please try again.');
                } finally {
                }
            }
        };

        fetchUserData();
    }, [currentUser]);

    // Add assignments
    const handleAddAssignments = async () => {
        const course = document.querySelector('select').value;
        const deadline = format(startDate, 'yyyy-MM-dd');

        const courseCollectionMap = {
            'Graphic Design': 'GD',
            'Web Development': 'WD',
            'Video Editing': 'VE',
        };

        const courseCollection = courseCollectionMap[course];

        if (!courseCollection) {
            setError('Invalid course selected.');
            return;
        }

        try {
            setLoading(true);
            const assignmentCountQuery = query(collection(firestore, courseCollection));
            const assignmentCountSnapshot = await getDocs(assignmentCountQuery);
            const assignmentNumber = assignmentCountSnapshot.size === 0 ? 1 : assignmentCountSnapshot.size + 1;

            const assignmentData = {
                submissionNumber: assignmentNumber,
                title: assignmentTitle,
                description: assignmentDes,
                deadline: deadline,
            };

            const assignmentRef = doc(firestore, courseCollection, assignmentNumber.toString());
            await setDoc(assignmentRef, assignmentData);

            console.log('Assignment added successfully!');
        } catch (error) {
            console.error('Error adding assignment:', error);
            setError('Failed to add assignment. Please try again.');
        } finally {
            setLoading(false);
            setIsModalOpen(false);
            setAssignmentTitle('');
            setAssignmentDes('');
            setStartDate(new Date());
        }
    };

    // Fetch assignments
    const fetchAssignments = async () => {
        if (currentUser) {
            setLoading(true);
            try {
                const userRef = doc(firestore, 'mentors', currentUser.email);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (typeof data.courses === 'string') {
                        data.courses = data.courses.split(',').map(course => course.trim());
                    }
                    setUserData(data);

                    const courseCollectionMap = {
                        'Graphic Design': 'GD',
                        'Web Development': 'WD',
                        'Video Editing': 'VE',
                    };

                    const allAssignments = [];

                    for (const course of data.courses) {
                        const courseCollection = courseCollectionMap[course];
                        if (!courseCollection) {
                            setError('Invalid course selected.');
                            return;
                        }
                        const assignmentsQuery = query(collection(firestore, courseCollection));
                        const assignmentsSnapshot = await getDocs(assignmentsQuery);
                        const courseAssignments = assignmentsSnapshot.docs.map(doc => {
                            const assignmentData = doc.data();
                            if (assignmentData.deadline) {
                                assignmentData.deadline = parseISO(assignmentData.deadline);
                            }
                            return assignmentData;
                        });
                        allAssignments.push(...courseAssignments);
                    }

                    setAssignments(allAssignments);
                } else {
                    setError('User data not found.');
                }
            } catch (error) {
                console.error('Error fetching assignments:', error);
                setError('Failed to fetch assignments. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchAssignments();
    }, [currentUser]);

    return (
        <div className='dashboard'>
            {loading && <LoadingScreen />}
            {error && <p className="error">{error}</p>}
            {userData ? (
                <>
                    <div className='add-assignments'>
                        <div>
                            <h2>Submissions</h2>
                        </div>
                        <div className='assignments-right'>
                            <div className='add-assignments-box'>
                                <h3>
                                    <button onClick={() => setIsModalOpen(true)}>
                                        Add<span id='add-btn' className="material-symbols-outlined">add</span>
                                    </button>
                                </h3>
                            </div>
                            <div className='add-assignments-box'>
                                <h3>
                                    <button>
                                        Manage Submissions<span id='add-btn' className="material-symbols-outlined">open_in_new</span>
                                    </button>
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className='submissions-box'>
                    {userData.courses.map((course, index) => (
                        <div key={index}>
                            <h3>{course}</h3>
                            {assignments.length > 0 ? (
                                assignments
                                    .filter(assignment => assignment.course === course)
                                    .sort((a, b) => b.submissionNumber - a.submissionNumber)
                                    .map((assignment) => {
                                        const now = new Date();
                                        const deadline = new Date(assignment.deadline);
                                        const isActive = now <= deadline || (now.getDate() === deadline.getDate() && now.getHours() <= 23 && now.getMinutes() <= 59);
                                        return (
                                            <div key={assignment.submissionNumber}>
                                                <label htmlFor={`toggle-${assignment.submissionNumber}`}>
                                                    <div className='submissions-box-header'>
                                                        <div>
                                                            <label htmlFor={`toggle-${assignment.submissionNumber}`}>Assignment {assignment.submissionNumber}:<span> {assignment.title}</span></label>
                                                        </div>
                                                        <div className='status'>
                                                            <p>Status: <span className={isActive ? 'Active' : 'Expired'}>{isActive ? 'Active' : 'Expired'}</span></p>
                                                        </div>
                                                    </div>
                                                </label>
                                                <input type='checkbox' id={`toggle-${assignment.submissionNumber}`} />
                                                <div className="menu-content" style={{ zIndex: -100 }}>
                                                    <div className='announcement-details'>
                                                        {assignment.deadline && (
                                                            <span>{format(assignment.deadline, 'yyyy-MM-dd')}</span>
                                                        )}
                                                        <p>{assignment.title}</p>
                                                        <p>{assignment.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <p>No assignments available.</p>
                            )}
                        </div>
                    ))}
                    </div>

                    <div className='dashboard-bottom-cards'>
                        <div className='dashboard-left-cards'>
                            <div className='dashboard-card-announcements'></div>
                        </div>
                    </div>

                    {/* Modal for adding announcement */}
                    <Modal show={isModalOpen} handleClose={() => setIsModalOpen(false)}>
                        <div className='announcement-modal'>
                            <h2>Add Assignments</h2>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddAssignments(); fetchAssignments(); }}>
                                <div>
                                    <label>Select Course:</label>
                                    <select required>
                                        {userData.courses.map((course, index) => (
                                            <option value={course} key={index}>
                                                {course}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Assignment Title:</label>
                                    <input type='text' value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} required />
                                </div>
                                <div>
                                    <label>Description:</label>
                                    <textarea value={assignmentDes} onChange={(e) => setAssignmentDes(e.target.value)} required />
                                </div>
                                <div>
                                    <label>Deadline:</label>
                                    <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} />
                                </div>
                                <button type="submit">Add Assignment</button>
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

export default Submissions;
