import React, { useState, useEffect } from 'react';
import './dashboard.css';
import './submissions.css';
import { useAuth } from '../hooks/useAuth';
import { firestore } from '../firebase';
import { doc, setDoc, getDoc, collection, query, getDocs, arrayRemove } from 'firebase/firestore';
import { format, parseISO, set } from 'date-fns';
import Modal from '../components/modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LoadingScreen from '../components/loadingScreen';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function Submissions() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDes, setAssignmentDes] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [clickedAssignment, setClickedAssignment] = useState(null);
  const [isActive, setIsActive] = useState(false);

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
        description: assignmentDes, // Store formatted HTML
        deadline: deadline,
        course: course,
      };

      const assignmentRef = doc(firestore, courseCollection, assignmentNumber.toString());
      await setDoc(assignmentRef, assignmentData);

      console.log('Assignment added successfully!');
    } catch (error) {
      console.error('Error adding assignment:', error);
      setError('Failed to add assignment. Please try again.');
    } finally {
      setLoading(false);
      setIsAddModalOpen(false);
      setAssignmentTitle('');
      setAssignmentDes('');
      setStartDate(new Date());
      fetchAssignments();
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

  const handleClickedAssignment = (assignment) => {
    console.log('clicked data:', assignment);
    setClickedAssignment(assignment);

    if (assignment.deadline) {
      const now = new Date();
      const deadline = new Date(assignment.deadline);
      setIsActive(now <= deadline || (now.getDate() === deadline.getDate() && now.getHours() <= 23 && now.getMinutes() <= 59));
    }
  };

  const manageSubmissions = () => {
    const courseCollectionMap = {
      'Graphic Design': 'gd',
      'Web Development': 'wd',
      'Video Editing': 've',
    };

    const courseCollection = courseCollectionMap[userData.courses[0]];

    if (!courseCollection) {
      setError('Invalid course selected.');
      return;
    }

    const link = 'https://bit.ly/' + courseCollection + '-submissions';
    window.open(link, '_blank');
  }


  const handleViewSubmissions = (course) => {
    const courseCollectionMap = {
      'Graphic Design': 'https://docs.google.com/spreadsheets/d/1PBggVFimkIQ_kpxDb49KH1YuB_ZjB1V59DSsL2KgTrM/edit?usp=sharing',
      'Web Development': 'wd',
      'Video Editing': 'https://docs.google.com/spreadsheets/d/1Rqa9GH4wc4kMWzJlIdxfJhrMWMaG_KDmM8EHwiCzz5g/edit?usp=sharing',
    };

    const courseCollection = courseCollectionMap[course];

    if (!courseCollection) {  
      setError('Invalid course selected.');
      return;
    }

    window.open(courseCollection, '_blank');
  };


  const modules = {
    toolbar: [
      [{ 'header': '1'}, { 'header': '2'},{ 'header': '3'}, { 'font': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'color': [] }],
      ['clean'] // remove formatting button
    ]
  };
  

  useEffect(() => {
    fetchAssignments();
  }, [currentUser]);

return (
    <div className='dashboard'>
        {loading && <LoadingScreen />}
        {error && <p className="error">{error}</p>}
        {userData ? (
            <>
                <div className='add-assignments'>
                    <div className='course-text'>
                        <p>Assignments</p>
                    </div>
                    <div className='assignments-right'>
                        <div className='add-assignments-box'>
                            <h3>
                                <button onClick={() => setIsAddModalOpen(true)}>
                                    Add<span id='add-btn' className="material-symbols-outlined">add</span>
                                </button>
                            </h3>
                        </div>
                        <div className='add-assignments-box'>
                            <h3>
                                <button onClick={manageSubmissions}>
                                    Manage Submissions<span id='add-btn' className="material-symbols-outlined">open_in_new</span>
                                </button>
                            </h3>
                        </div>
                    </div>
                </div>

                <div className='submissions-box'>
                        {userData.courses.map((course, index) => {
    const courseAssignments = assignments.filter(assignment => assignment.course === course);
    
    // If there are assignments for this course, render the course name and its assignments
    if (courseAssignments.length > 0) {
        return (
            <div key={index} className='submission'>
                <h3 className='course-name'>&gt; {course}</h3>
                <div className='submission-div'>
                    {courseAssignments
                        .sort((a, b) => b.submissionNumber - a.submissionNumber)
                        .map((assignment) => {
                            const now = new Date();
                            const deadline = new Date(assignment.deadline);
                            const isActive = now <= deadline || (now.getDate() === deadline.getDate() && now.getHours() <= 23 && now.getMinutes() <= 59);
                            return (
                                <div key={assignment.submissionNumber}>
                                    <label htmlFor={`toggle-${assignment.submissionNumber}`}>
                                        <div className='submissions-box-header' onClick={() => { setIsAssignmentModalOpen(true); handleClickedAssignment(assignment); }}>
                                            <div className='submission-box-title'>
                                                <div><p className='box-number'>Assignment {assignment.submissionNumber} :&nbsp;&nbsp;</p></div> <div><p className='box-title'> {assignment.title}</p></div>
                                            </div>
                                            <div className='status'>
                                                <p><span className={isActive ? 'Active' : 'Expired'}>{isActive ? 'Active' : 'Closed'}</span></p>
                                            </div>
                                        </div>
                                    </label>
                                    <input type='checkbox' id={`toggle-${assignment.submissionNumber}`} />
                                    <div className="menu-content" style={{ zIndex: -100 }}>
                                        <p dangerouslySetInnerHTML={{ __html: assignment.description }} />
                                        {assignment.deadline && (
                                            <span>{format(assignment.deadline, 'yyyy-MM-dd')}</span>
                                        )}<br></br>
                                        <button>View Submissions</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    } else {    
        return (
            <div key={index} className='submission'>
                <h3 className='course-name'>&gt; {course}</h3>
                <div className='submission-div'>
                    <p>No assignments found for this course.</p>
                </div>
            </div>
        );
    }
})}

                        </div>

                <div className='dashboard-bottom-cards'>
                    <div className='dashboard-left-cards'>
                        <div className='dashboard-card-announcements'></div>
                    </div>
                </div>

                {/* Modal for adding assignment */}
                <Modal show={isAddModalOpen} handleClose={() => setIsAddModalOpen(false)}>
                    <div className='announcement-modal'>
                        <h2>Add Assignments</h2>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddAssignments(); }}>
                            <div>
                                <label>Select Course:</label>
                                <select required className='select'>
                                    {userData.courses.map((course, index) => (
                                        <option value={course} key={index}>
                                            {course}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label>Assignment Title:</label><br></br>
                                <input className='assign-title' type='text' value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} required />
                            </div>
                            <div>
                                <label>Description:</label>
                                <ReactQuill
                                    value={assignmentDes}
                                    onChange={setAssignmentDes}
                                    theme="snow"
                                    className='text-editor'
                                    modules={modules}
                                    required
                                />
                            </div>
                            <div className='assign-deadline'>
                                <label>Deadline:</label>
                                <DatePicker className='date-picker' selected={startDate} onChange={(date) => setStartDate(date)} />
                            </div>
                            <button className='announcement-modal-button' type="submit">Add Assignment</button>
                        </form>
                    </div>
                </Modal>

                {/* Modal for opening assignments */}
                <Modal show={isAssignmentModalOpen} handleClose={() => setIsAssignmentModalOpen(false)}>
                    <div className='manage-modal'>
                        {clickedAssignment && (
                            <div className='assignment-handle'>
                                <p className='assignment-handle-number'>Assignment {clickedAssignment.submissionNumber}</p>
                                    <span id='active' className={isActive ? 'Active' : 'Expired'}>{isActive ? 'Active' : 'Closed'}</span>
                                <p className='assignment-handle-title'>{clickedAssignment.title}</p>
                                <div className='dash-line'></div>
                                <p className='assignment-handle-des' dangerouslySetInnerHTML={{ __html: clickedAssignment.description }} />
                                <div className='dash-line'></div>
                                {clickedAssignment.deadline && (
                                    <p className='assignment-handle-deadline'>Deadline : {format(clickedAssignment.deadline, 'yyyy-MM-dd')}</p>
                                )}
                                <div className='dash-line'></div>
                                <button onClick= {(e)=>{handleViewSubmissions(clickedAssignment.course)}} className='announcement-modal-button assign-btn' >View Submissions</button>
                            </div>
                        )}
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
