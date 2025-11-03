
const { DataTypes } = require('sequelize');
const sequelize = require('../utils/db');
const Event = require('./Event'); 
const UserStub = require('./UserStub');

const EventParticipant = sequelize.define('EventParticipant', {

    event_id: {
        type: DataTypes.UUID,
        references: { 
            model: Event,
            key: 'event_id'
        },
        primaryKey: true
    },
    
    attendee_id: { 
        type: DataTypes.UUID,
        primaryKey: true
    },
    
    joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'event_participants',
    timestamps: false, 
    createdAt: 'joined_at',
    updatedAt: false,
    timestamps: true
});

Event.belongsToMany(UserStub, { through: EventParticipant, foreignKey: 'event_id', otherKey: 'attendee_id' });
UserStub.belongsToMany(Event, { through: EventParticipant, foreignKey: 'attendee_id', otherKey: 'event_id' });

module.exports = EventParticipant;