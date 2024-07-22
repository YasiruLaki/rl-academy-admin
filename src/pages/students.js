import React from 'react';
import './dashboard.css';
import './students.css';
import Sidebar from '../components/sidebar';
import LoadingScreen from '../components/loadingScreen';

function Students() {
    return (
        <div>
            <Sidebar />
            <div className='dashboard'>
                <h1>Students</h1>

                <div>
                <p>This Page will update soon!</p>
            </div>
            </div>
        </div>
    );
}

export default Students;