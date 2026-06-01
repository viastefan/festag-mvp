'use client'

import RelationsVeyra from '@/components/RelationsVeyra'
import { motion } from 'framer-motion'

export default function RelationsAIPage() {
  return (
    <div className="page-content" style={{ padding: 0, maxWidth: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .3, ease: [.16, 1, .3, 1] }}
        style={{ height: 'calc(100dvh - 0px)' }}
      >
        <RelationsVeyra />
      </motion.div>
    </div>
  )
}
