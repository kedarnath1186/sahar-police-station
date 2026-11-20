import { Router } from 'express'
import {
  MAHARASHTRA_DISTRICTS,
  INDIAN_STATES,
  LOCATION_STATUS_CHOICES,
  LOCATION_ACCURACY_CHOICES,
  ACCURACY_RADIUS_METERS,
} from '../config.js'

export const choicesRouter = Router()

choicesRouter.get('/', (req, res) => {
  res.json({
    districts: MAHARASHTRA_DISTRICTS.map((d) => ({ value: d, label: d })),
    states: INDIAN_STATES.map((s) => ({ value: s, label: s })),
    statuses: LOCATION_STATUS_CHOICES,
    accuracies: LOCATION_ACCURACY_CHOICES,
    accuracy_radii: ACCURACY_RADIUS_METERS,
  })
})
