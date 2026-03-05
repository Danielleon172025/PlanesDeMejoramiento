USE [DashboardSiapoas]
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[Identity].[Users]') 
    AND name = 'MustChangePassword'
)
BEGIN
    ALTER TABLE [Identity].[Users] ADD MustChangePassword BIT NOT NULL DEFAULT 1;
END
GO
